# WP BARQ Lambda Monitoring

This directory contains the AWS Lambda function code that acts as the central intelligence and rate-limiting gateway for WP BARQ.

The plugin sends raw events (PHP fatals, failed logins, etc.) to a URL exposed by AWS API Gateway or a Lambda Function URL. This Lambda function validates the request signature, applies rate limits via DynamoDB to prevent alarm fatigue/spam, and publishes qualifying events to Amazon SNS.

## Prerequisites

1. An AWS Account.
2. An existing Amazon SNS Topic (with subscribers like your email or SMS).
3. A DynamoDB Table for rate limiting.

## Step 1: Create the DynamoDB Table

1. Go to the AWS DynamoDB Console.
2. Click **Create table**.
3. **Table name**: `WpBarqRateLimits` (or anything else, but remember it).
4. **Partition key**: `id` (String).
5. Leave other settings as default and click **Create table**.

## Step 2: Deploy the Lambda Function

1. Open a terminal in this `lambda` directory.
2. Run `npm install` to install dependencies (the AWS SDK is built-in to Lambda but needed for local bundling if you zip it outside). Actually, since AWS SDK v3 is pre-installed in Node.js 18+ Lambda runtimes, you can just zip the `index.js` file alone!
3. Zip the file:
   ```bash
   zip function.zip index.js package.json
   ```
4. Go to the AWS Lambda Console and click **Create function**.
5. Choose **Author from scratch**.
6. **Function name**: `wp-barq-monitoring`
7. **Runtime**: `Node.js 20.x` or `Node.js 18.x`
8. **Architecture**: x86_64 or arm64 (both fine).
9. Click **Create function**.
10. In the "Code" source tab, click **Upload from** -> **.zip file** and upload your `function.zip`.

## Step 3: Configure Environment Variables

In the Lambda console, go to **Configuration** > **Environment variables** and add:

- `WP_BARQ_SHARED_SECRET`: Create a strong random string (e.g., a 64-character hex string). **This must exactly match the `LAMBDA_SHARED_SECRET` in `AwsConfig.php`**.
- `SNS_TOPIC_ARN`: The ARN of your SNS Topic (e.g., `arn:aws:sns:us-east-1:1234567890:MyTopic`).
- `DYNAMODB_TABLE_NAME`: The name of the table you created in Step 1 (e.g., `WpBarqRateLimits`).

## Step 4: Grant IAM Permissions

Your Lambda function needs permission to read/write to DynamoDB and publish to SNS. 
1. Go to **Configuration** > **Permissions** and click the Execution Role name.
2. In IAM, add an inline policy to that role with the following permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "dynamodb:GetItem",
                "dynamodb:PutItem",
                "dynamodb:UpdateItem"
            ],
            "Resource": "arn:aws:dynamodb:REGION:ACCOUNT_ID:table/WpBarqRateLimits"
        },
        {
            "Effect": "Allow",
            "Action": [
                "sns:Publish"
            ],
            "Resource": "arn:aws:sns:REGION:ACCOUNT_ID:MyTopic"
        }
    ]
}
```

## Step 5: Expose the Function (Function URL)

1. Go to **Configuration** > **Function URL**.
2. Click **Create function URL**.
3. **Auth type**: `NONE` (We use HMAC signature validation inside the code, so AWS IAM auth isn't required for the invoke). 
4. Click **Save**.
5. Copy the generated Function URL.

## Step 6: Update Plugin Configuration

Finally, paste the Function URL and the Shared Secret you created into the `inc/Config/AwsConfig.php` file in the WP BARQ plugin:

```php
    // Lambda Configuration
    const LAMBDA_ENDPOINT_URL  = 'https://your-function-url.lambda-url.region.on.aws/';
    const LAMBDA_SHARED_SECRET = 'YOUR_LONG_RANDOM_SECRET_STRING';
```

Done! WP BARQ will now securely push events to Lambda.
