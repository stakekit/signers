import { ethers, BytesLike } from 'ethers';
import { isEIP712Message } from '../utils/is-eip712';

export class EthWalletApp extends ethers.Wallet {
  constructor(readonly _privateKey: BytesLike) {
    super(_privateKey);
  }

  async signTypedData(signedTypedData: Record<string, any>): Promise<string> {
    if (!isEIP712Message(signedTypedData)) {
      throw new Error('signedTypedData');
    }

    const { domain, types, message } = signedTypedData;
    return await this._signTypedData(domain, types, message);
  }
}
