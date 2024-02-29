import { EIP712Message } from '@ledgerhq/types-live';
// As defined in [spec](https://eips.ethereum.org/EIPS/eip-712), the properties below are all required.
export function isEIP712Message(message: unknown): message is EIP712Message {
  return (
    message != undefined &&
    typeof message === 'object' &&
    'types' in message &&
    'primaryType' in message &&
    'domain' in message &&
    'message' in message
  );
}
