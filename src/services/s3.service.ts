import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { config } from '../config';

const client = new S3Client({
  region: config.aws.region,
  credentials:
    config.aws.accessKeyId && config.aws.secretAccessKey
      ? {
          accessKeyId: config.aws.accessKeyId,
          secretAccessKey: config.aws.secretAccessKey,
        }
      : undefined,
});

const buildFileUrl = (key: string) => {
  if (config.aws.baseUrl) {
    return `${config.aws.baseUrl.replace(/\/$/, '')}/${key}`;
  }
  return `https://${config.aws.bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
};

export const createPresignedUpload = async (params: {
  keyPrefix?: string;
  fileName: string;
  contentType: string;
}) => {
  if (!config.aws.bucket) {
    throw new Error('S3 bucket not configured');
  }

  const sanitizedName = params.fileName.replace(/[^\w.\-]/g, '_');
  const key = `${params.keyPrefix ?? 'uploads'}/${crypto.randomUUID()}-${sanitizedName}`;

  const command = new PutObjectCommand({
    Bucket: config.aws.bucket,
    Key: key,
    ContentType: params.contentType,
  });

  const uploadUrl = await getSignedUrl(client, command, {
    expiresIn: config.aws.presignExpires,
  });

  return {
    uploadUrl,
    fileUrl: buildFileUrl(key),
    key,
    expiresIn: config.aws.presignExpires,
  };
};

export const createPresignedGet = async (params: { key: string }) => {
  if (!config.aws.bucket) {
    throw new Error('S3 bucket not configured');
  }

  const command = new GetObjectCommand({
    Bucket: config.aws.bucket,
    Key: params.key,
  });

  const url = await getSignedUrl(client, command, {
    expiresIn: config.aws.presignExpires,
  });

  return {
    url,
    expiresIn: config.aws.presignExpires,
  };
};
