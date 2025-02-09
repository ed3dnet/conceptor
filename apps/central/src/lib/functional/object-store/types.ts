import { type S3BucketName, type S3PublicBucketName } from "./config.js";

export type S3Locator = {
  bucket: S3BucketName;
  objectName: string;
};

export type S3PublicLocator = {
  bucket: S3PublicBucketName;
  objectName: string;
};

export type S3LocatorBase = {
  bucket: S3BucketName;
  objectNameBase: string;
};

export type UploadFileFromDiskOptions = {
  destination: S3Locator;
  filePath: string;
};

export type UploadFileFromRemoteOptions = {
  sourceUrl: string;
  destination: S3Locator;
  maxFileSize: number | "unlimited";
  appendSourceExtension?: boolean;
  contentTypeOverride?: string;
};

export type UploadFileFromRemoteResult = {
  httpUrl: string | null;
  destination: S3Locator;
  contentType: string;
};

export type CopyImageAndUploadOptimizedOptions = {
  sourceUrl: string;
  destinationBase: S3LocatorBase;
  imageType: "avatar";
};
