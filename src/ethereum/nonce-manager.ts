import { ethers } from 'ethers';

export class NonceManager extends ethers.Signer {
  readonly signer!: ethers.Signer;

  _initialPromise!: Promise<number>;
  _deltaCount: number;

  constructor(signer: ethers.Signer) {
    super();
    this._deltaCount = 0;
    ethers.utils.defineReadOnly(this, 'signer', signer);
    ethers.utils.defineReadOnly(this, 'provider', signer.provider);
  }

  connect(provider: ethers.providers.Provider): NonceManager {
    return new NonceManager(this.signer.connect(provider));
  }

  getAddress(): Promise<string> {
    return this.signer.getAddress();
  }

  getTransactionCount(blockTag?: ethers.providers.BlockTag): Promise<number> {
    if (blockTag === 'pending') {
      if (this._initialPromise === undefined) {
        this._initialPromise = this.signer.getTransactionCount('pending');
      }
      const deltaCount = this._deltaCount;
      return this._initialPromise.then((initial) => initial + deltaCount);
    }

    return this.signer.getTransactionCount(blockTag);
  }

  setTransactionCount(
    transactionCount:
      | ethers.BigNumberish
      | Promise<ethers.BigNumberish | undefined>,
  ): void {
    this._initialPromise = Promise.resolve(transactionCount).then((nonce) => {
      return ethers.BigNumber.from(nonce).toNumber();
    });
    this._deltaCount = 0;
  }

  incrementTransactionCount(count?: number): void {
    this._deltaCount += count == null ? 1 : count;
  }

  signMessage(message: ethers.Bytes | string): Promise<string> {
    return this.signer.signMessage(message);
  }

  signTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>,
  ): Promise<string> {
    return this.signer.signTransaction(transaction);
  }

  sendTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>,
  ): Promise<ethers.providers.TransactionResponse> {
    if (transaction.nonce !== undefined) {
      this.setTransactionCount(transaction.nonce);
      this._deltaCount++;
    } else {
      transaction = ethers.utils.shallowCopy(transaction);
      transaction.nonce = this.getTransactionCount('pending');
      this.incrementTransactionCount();
    }

    return this.signer.sendTransaction(transaction).then((tx) => {
      return tx;
    });
  }

  populateTransaction(
    transaction: ethers.utils.Deferrable<ethers.providers.TransactionRequest>,
  ): Promise<ethers.providers.TransactionRequest> {
    if (transaction.nonce !== undefined) {
      this.setTransactionCount(transaction.nonce);
      this._deltaCount++;
    } else {
      transaction = ethers.utils.shallowCopy(transaction);
      transaction.nonce = this.getTransactionCount('pending');
      this.incrementTransactionCount();
    }

    return this.signer.populateTransaction(transaction).then((tx) => {
      return tx;
    });
  }
}
