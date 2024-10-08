import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as path from 'path';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ETLStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create S3 bucket for raw data
    const rawBucket = new s3.Bucket(this, 'RawDataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Create S3 bucket for processed data
    const processedBucket = new s3.Bucket(this, 'ProcessedDataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Lambda function definition
    const transformerLambda = new lambda.Function(this, 'TransformerFunction', {
      runtime: lambda.Runtime.PROVIDED_AL2,
      handler: 'bootstrap', // Not used in Rust but required by CDK
      code: lambda.Code.fromAsset(path.join(__dirname, '../dist/etl-transformer.zip')),
      environment: {
        PROCESSED_BUCKET_NAME: processedBucket.bucketName,
      },
      memorySize: 512,  // Allocate minimum memory necessary
      timeout: cdk.Duration.seconds(30),  // Adjust based on processing needs
    });

    // Grant Lambda permissions
    rawBucket.grantRead(transformerLambda);
    processedBucket.grantWrite(transformerLambda);

    // Set up S3 event notifications
    rawBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(transformerLambda)
    );
  }
}
