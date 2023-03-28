import Bip38 from "@/services/bip38";
import WalletService from "@/services/wallet";

export default {
    methods: {
    /**
     * Encrypt the wallet mnemonic if has a password and store it
     */
        async onCreate () {
            this.wallet = {
                ...this.schema,
                profileId: this.session_profile.id
            };
            // NOTE: this property is only used on `WalletImport`
            if (!this.useOnlyAddress) {
                this.wallet.publicKey = WalletService.getPublicKeyFromMnemonic(this.wallet.mnemonic);
            }

            if (!this.useOnlyAddress && this.walletPassword && this.walletPassword.length) {
                this.showEncryptLoader = true;

                const dataToEncrypt = {
                    mnemonic: this.wallet.mnemonic,
                    password: this.walletPassword,
                    wif: this.session_network.wif
                };

                let failed = false;
                const bip38 = new Bip38();
                try {
                    const { bip38key } = await bip38.encrypt(dataToEncrypt);
                    this.wallet.mnemonic = bip38key;
                } catch (_error) {
                    this.$error(this.$t("ENCRYPTION.FAILED_ENCRYPT"));
                    failed = true;
                } finally {
                    bip38.quit();
                }

                this.showEncryptLoader = false;

                if (failed) {
                    return;
                }
            } else {
                this.wallet.mnemonic = null;
            }

            this.createWallet();
        }
    }
};
