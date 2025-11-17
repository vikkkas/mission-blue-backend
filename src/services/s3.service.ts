import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

export class S3Service {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
    });
    this.bucketName = config.aws.s3BucketName;
  }

  /**
   * Upload file to S3
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: 'photos' | 'id-proofs' | 'student-ids'
  ): Promise<string> {
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `${folder}/${fileName}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'public-read', // Make files publicly accessible
    });

    await this.s3Client.send(command);

    // Return the full S3 URL
    return `https://${this.bucketName}.s3.${config.aws.region}.amazonaws.com/${key}`;
  }

  /**
   * Upload photo
   */
  async uploadPhoto(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'photos');
  }

  /**
   * Upload ID proof
   */
  async uploadIdProof(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'id-proofs');
  }

  /**
   * Upload student ID
   */
  async uploadStudentId(file: Express.Multer.File): Promise<string> {
    return this.uploadFile(file, 'student-ids');
  }

  /**
   * Delete file from S3
   */
  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract the key from the URL
      const url = new URL(fileUrl);
      const key = url.pathname.substring(1); // Remove leading slash

      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      // Don't throw error, just log it
    }
  }

  /**
   * Delete multiple files from S3
   */
  async deleteFiles(fileUrls: string[]): Promise<void> {
    const deletePromises = fileUrls.map((url) => this.deleteFile(url));
    await Promise.allSettled(deletePromises);
  }
}

export default new S3Service();
