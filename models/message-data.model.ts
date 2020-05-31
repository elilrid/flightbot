export class MessageData {
  recipient: { id: string } | undefined;
  message: { text: string, metadata: string } | undefined;
}