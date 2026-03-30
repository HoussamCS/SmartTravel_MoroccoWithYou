import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function buildClient(opts: {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
}): S3Client {
  return new S3Client({
    endpoint: opts.endpoint,
    credentials: {
      accessKeyId: opts.accessKeyId,
      secretAccessKey: opts.secretAccessKey,
    },
    region: "auto",
    forcePathStyle: false,
  });
}

export interface UploadResult {
  url: string;
  key: string;
}

export async function uploadToR2(opts: {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  r2PublicUrl: string;
}): Promise<UploadResult> {
  if (!ALLOWED_MIME_TYPES.includes(opts.mimeType)) {
    const err = new Error(
      `File type ${opts.mimeType} is not allowed. Allowed types: ${ALLOWED_MIME_TYPES.join(", ")}`
    ) as Error & { statusCode?: number };
    err.statusCode = 415;
    throw err;
  }

  if (opts.buffer.length > MAX_SIZE_BYTES) {
    const err = new Error(
      `File is too large (${(opts.buffer.length / 1024 / 1024).toFixed(2)} MB). Max allowed: 10 MB`
    ) as Error & { statusCode?: number };
    err.statusCode = 413;
    throw err;
  }

  const ext = opts.mimeType.split("/")[1];
  const key = `uploads/${randomUUID()}.${ext}`;

  const client = buildClient({
    endpoint: opts.r2Endpoint,
    accessKeyId: opts.r2AccessKeyId,
    secretAccessKey: opts.r2SecretAccessKey,
  });

  await client.send(
    new PutObjectCommand({
      Bucket: opts.r2Bucket,
      Key: key,
      Body: opts.buffer,
      ContentType: opts.mimeType,
      CacheControl: "public, max-age=31536000",
    })
  );

  return {
    key,
    url: `${opts.r2PublicUrl.replace(/\/$/, "")}/${key}`,
  };
}

export async function deleteFromR2(opts: {
  key: string;
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
}): Promise<void> {
  const client = buildClient({
    endpoint: opts.r2Endpoint,
    accessKeyId: opts.r2AccessKeyId,
    secretAccessKey: opts.r2SecretAccessKey,
  });

  await client.send(
    new DeleteObjectCommand({
      Bucket: opts.r2Bucket,
      Key: opts.key,
    })
  );
}
