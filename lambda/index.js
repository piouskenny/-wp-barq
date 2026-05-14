import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import crypto from 'crypto';

// Initialize AWS Clients
const snsClient = new SNSClient({});
const ddbClient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(ddbClient);

// Environment Variables
const SHARED_SECRET = process.env.WP_BARQ_SHARED_SECRET;
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN;
const RATE_LIMIT_TABLE = process.env.DYNAMODB_TABLE_NAME || 'WpBarqRateLimits';

// Rate Limiting Config
// Max events per type per hour
const RATE_LIMITS = {
    'php_fatal': 10,
    'fault_surge': 3,
    'health_critical': 5,
    'security_login_fail': 20,
    'security_brute_force': 5,
    'security_file_change': 3
};


export const handler = async (event) => {
    try {
        // 1. Extract and Validate Signature
        const signature = event.headers['x-wp-barq-signature'] || event.headers['X-WP-BARQ-Signature'];
        if (!signature || !SHARED_SECRET) {
            return { statusCode: 401, body: JSON.stringify({ error: 'Missing signature or unconfigured secret.' }) };
        }

        const body = event.body;
        const expectedSignature = crypto.createHmac('sha256', SHARED_SECRET).update(body).digest('hex');
        
        if (signature !== expectedSignature) {
            console.warn('Invalid signature detected. Possible unauthorized request.');
            return { statusCode: 403, body: JSON.stringify({ error: 'Invalid signature.' }) };
        }

        // 2. Parse Payload
        const payload = JSON.parse(body);
        const { type, severity, message, context } = payload;
        const domain = context?.domain || 'unknown-domain';

        console.log(`Received ${type} event from ${domain} with severity ${severity}`);

        // 3. Rate Limiting via DynamoDB
        const limit = RATE_LIMITS[type] || 5; // Default fallback limit
        const currentHour = new Date().toISOString().slice(0, 13); // e.g. "2026-04-13T10"
        const limitKey = `${domain}#${type}#${currentHour}`;

        try {
            const getOutput = await docClient.send(new GetCommand({
                TableName: RATE_LIMIT_TABLE,
                Key: { id: limitKey }
            }));

            let count = getOutput.Item?.count || 0;

            if (count >= limit) {
                console.log(`Rate limit exceeded for ${limitKey}. Skipping SNS publish.`);
                return { statusCode: 429, body: JSON.stringify({ message: 'Rate limit exceeded.' }) };
            }

            // Increment count directly in DDB (PutCommand overrides, but for low volume it's fine. UpdateCommand is better but complex for this example)
            await docClient.send(new PutCommand({
                TableName: RATE_LIMIT_TABLE,
                Item: {
                    id: limitKey,
                    count: count + 1,
                    ttl: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24hr expiry
                }
            }));
            
        } catch (dbError) {
            console.error('DynamoDB Error:', dbError);
            // If DB fails, we still want to send the critical alert, we just bypass rate limiting.
        }

        // 4. Publish to SNS
        if (SNS_TOPIC_ARN) {
            const snsMessage = `
WP BARQ Cloud Alert
--------------------
Type: ${type.toUpperCase()}
Severity: ${severity}
Domain: ${domain}
Time: ${context?.time || 'N/A'}

Message:
${message}

Context:
${JSON.stringify(context, null, 2)}
            `.trim();

            await snsClient.send(new PublishCommand({
                TopicArn: SNS_TOPIC_ARN,
                Subject: `WP BARQ Alert [${severity}]: ${type}`,
                Message: snsMessage
            }));
            
            console.log('SNS Published successfully.');
        } else {
            console.warn('SNS_TOPIC_ARN is not configured. Event processed but not published.');
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Event successfully processed.' }),
        };

    } catch (error) {
        console.error('Handler Error:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Internal Server Error' }),
        };
    }
};
