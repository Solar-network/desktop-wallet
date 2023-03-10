<template>
  <ModalWindow
    :title="$t('SIGN_VERIFY.TITLE_SIGN')"
    @close="emitCancel"
  >
    <div class="flex flex-col justify-center w-80">
      <InputText
        :is-read-only="true"
        :label="$t('SIGN_VERIFY.ADDRESS')"
        :value="wallet.address"
        name="address"
        class="mt-5"
      />

      <InputText
        ref="message"
        v-model="$v.form.message.$model"
        :label="$t('SIGN_VERIFY.MESSAGE')"
        :helper-text="messageError"
        :is-invalid="$v.form.message.$error"
        name="message"
        class="mt-5"
      />

      <div
        v-if="wallet.isLedger"
        class="mt-5"
      >
        {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
      </div>

      <InputPassword
        v-else-if="wallet.mnemonic"
        ref="password"
        v-model="$v.form.walletPassword.$model"
        :label="$t('TRANSACTION.PASSWORD')"
        :is-required="true"
        class="mt-5"
      />

      <MnemonicInput
        v-else
        ref="mnemonic"
        v-model="$v.form.mnemonic.$model"
        :is-invalid="$v.form.mnemonic.$error"
        :address="wallet.address"
        :pub-key-hash="session_network.version"
        class="mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        class="blue-button mt-5"
        type="button"
        @click="onSignMessage"
      >
        {{ $t('SIGN_VERIFY.SIGN') }}
      </button>
    </div>

    <ModalLoader
      :message="$t('ENCRYPTION.DECRYPTING')"
      :visible="showEncryptLoader"
    />
    <ModalLoader
      :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
      :visible="showLedgerLoader"
    />
  </ModalWindow>
</template>

<script>
import { required, minLength } from "vuelidate/lib/validators";
import { InputPassword, InputText } from "@/components/Input";
import { ModalLoader, ModalWindow } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import Bip38 from "@/services/bip38";
import TransactionService from "@/services/transaction";
import WalletService from "@/services/wallet";

export default {
    name: "WalletSignModal",

    components: {
        InputPassword,
        InputText,
        ModalLoader,
        ModalWindow,
        MnemonicInput
    },

    props: {
        wallet: {
            type: Object,
            required: true
        }
    },

    data: () => ({
        form: {
            message: "",
            mnemonic: "",
            walletPassword: ""
        },
        showEncryptLoader: false,
        showLedgerLoader: false
    }),

    computed: {
        messageError () {
            if (this.$v.form.message.$error && this.$v.form.message.minLength) {
                return this.$t("VALIDATION.REQUIRED", [this.$refs.message.label]);
            }
            return null;
        }
    },

    methods: {
        async onSignMessage () {
            if (this.form.walletPassword && this.form.walletPassword.length) {
                this.showEncryptLoader = true;

                const dataToDecrypt = {
                    bip38key: this.wallet.mnemonic,
                    password: this.form.walletPassword,
                    wif: this.session_network.wif
                };

                const bip38 = new Bip38();
                try {
                    const { encodedWif } = await bip38.decrypt(dataToDecrypt);
                    this.form.mnemonic = null;
                    this.form.wif = encodedWif;
                } catch (_error) {
                    this.$error(this.$t("ENCRYPTION.FAILED_DECRYPT"));

                    return;
                } finally {
                    bip38.quit();
                    this.showEncryptLoader = false;
                }
            }

            await this.signMessage();
        },

        async signMessage () {
            try {
                let message;
                if (!this.wallet.isLedger) {
                    if (this.form.wif) {
                        message = WalletService.signMessageWithWif(
                            this.form.message,
                            this.form.wif,
                            {
                                wif: this.session_network.wif
                            }
                        );
                    } else {
                        message = WalletService.signMessage(this.form.message, this.form.mnemonic);
                    }
                } else {
                    this.showLedgerLoader = true;
                    try {
                        message = {
                            message: this.form.message,
                            signature: await TransactionService.ledgerSignMessage(this.wallet, this.form.message, this)
                        };
                    } catch (ledgerError) {
                        this.showLedgerLoader = false;
                        throw ledgerError;
                    }
                    this.showLedgerLoader = false;
                }

                message.timestamp = new Date().getTime();
                message.address = this.wallet.address;
                this.$store.dispatch("wallet/addSignedMessage", message);

                this.$success(this.$t("SIGN_VERIFY.SUCCESSFULL_SIGN"));

                this.emitSigned();
            } catch (error) {
                this.$logger.error("Could not sign message: ", error);
                this.$error(this.$t("SIGN_VERIFY.FAILED_SIGN"));
            }
        },

        emitCancel () {
            this.$emit("cancel");
        },

        emitSigned () {
            this.$emit("signed");
        }
    },

    validations: {
        form: {
            message: {
                required,
                minLength: minLength(1)
            },
            mnemonic: {
                isValid () {
                    if (this.wallet.mnemonic) {
                        return true;
                    } else if (this.wallet && (this.wallet.isLedger || this.wallet.mnemonic)) {
                        return true;
                    }

                    if (this.$refs.mnemonic) {
                        return !this.$refs.mnemonic.$v.$invalid;
                    }

                    return false;
                }
            },
            walletPassword: {
                isValid () {
                    if (!this.wallet.mnemonic) {
                        return true;
                    } else if (this.wallet && (this.wallet.isLedger || !this.wallet.mnemonic)) {
                        return true;
                    }

                    if (!this.form.walletPassword || !this.form.walletPassword.length) {
                        return false;
                    }

                    if (this.$refs.password) {
                        return !this.$refs.password.$v.$invalid;
                    }

                    return false;
                }
            }
        }
    }
};
</script>
