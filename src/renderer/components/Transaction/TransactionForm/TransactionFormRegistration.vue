<template>
  <form
    class="TransactionFormRegistration flex flex-col"
    @submit.prevent
  >
    <template v-if="!currentWallet.isBlockProducer">
      <ListDivided :is-floating-label="true">
        <ListDividedItem
          :label="$t('TRANSACTION.SENDER')"
          item-value-class="w-full"
        >
          <span class="break-words">
            {{ senderLabel }}
          </span>
          <span
            v-if="senderLabel !== currentWallet.address"
            class="text-sm text-theme-page-text-light"
          >
            {{ currentWallet.address }}
          </span>
        </ListDividedItem>
      </ListDivided>

      <InputText
        v-model="$v.form.username.$model"
        :helper-text="usernameError"
        :label="$t('WALLET_BLOCK_PRODUCERS.USERNAME')"
        :is-invalid="!!usernameError"
        class="TransactionFormRegistration__username mb-5"
        name="username"
      />

      <InputFee
        ref="fee"
        :currency="walletNetwork.token"
        :transaction-type="$options.transactionType"
        :show-insufficient-funds="true"
        class="TransactionFormRegistration__fee"
        @input="onFee"
      />

      <div v-if="!isMultiSignature">
        <div
          v-if="currentWallet.isLedger"
          class="TransactionFormRegistration__ledger-notice mt-10"
        >
          {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
        </div>

        <InputPassword
          v-else-if="currentWallet.mnemonic"
          ref="password"
          v-model="$v.form.walletPassword.$model"
          :label="$t('TRANSACTION.PASSWORD')"
          :is-required="true"
          class="TransactionFormRegistration__password mt-4"
        />

        <MnemonicInput
          v-else
          ref="mnemonic"
          v-model="$v.form.mnemonic.$model"
          :address="currentWallet.address"
          :pub-key-hash="walletNetwork.version"
          class="TransactionFormRegistration__mnemonic mt-4"
        />
      </div>

      <MnemonicInput
        v-if="currentWallet.secondPublicKey"
        ref="extraMnemonic"
        v-model="$v.form.extraMnemonic.$model"
        :label="$t('TRANSACTION.EXTRA_MNEMONIC')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormRegistration__extra-mnemonic mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        class="TransactionFormRegistration__next blue-button mt-10 ml-0"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>

      <ModalLoader
        ref="modalLoader"
        :message="$t('ENCRYPTION.DECRYPTING')"
        :visible="showEncryptLoader"
      />
      <ModalLoader
        :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
        :visible="showLedgerLoader"
      />

      <Portal to="transaction-footer">
        <footer class="ModalWindow__container__footer--warning">
          {{ $t('TRANSACTION.FOOTER_TEXT.REGISTRATION') }}
        </footer>
      </Portal>
    </template>
    <template v-else>
      {{ $t('WALLET_BLOCK_PRODUCERS.ALREADY_REGISTERED') }}
    </template>
  </form>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { InputFee, InputPassword, InputText } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import { ModalLoader } from "@/components/Modal";
import { MnemonicInput } from "@/components/Mnemonic";
import WalletService from "@/services/wallet";
import mixin from "./mixin";

export default {
    name: "TransactionFormRegistration",

    transactionType: TRANSACTION_TYPES.GROUP_1.REGISTRATION,

    components: {
        InputFee,
        InputPassword,
        InputText,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        MnemonicInput
    },

    mixins: [mixin],

    data: () => ({
        form: {
            fee: 0,
            username: "",
            mnemonic: "",
            walletPassword: ""
        }
    }),

    computed: {
        usernameError () {
            if (this.$v.form.username.$dirty && this.$v.form.username.$error) {
                if (!this.$v.form.username.isNotEmpty) {
                    return this.$t("WALLET_BLOCK_PRODUCERS.USERNAME_EMPTY_ERROR");
                } else if (!this.$v.form.username.isMaxLength) {
                    return this.$t("WALLET_BLOCK_PRODUCERS.USERNAME_MAX_LENGTH_ERROR");
                } else if (!this.$v.form.username.doesNotExist) {
                    return this.$t("WALLET_BLOCK_PRODUCERS.USERNAME_EXISTS");
                }

                return this.$t("WALLET_BLOCK_PRODUCERS.USERNAME_ERROR");
            }

            return null;
        }
    },

    methods: {
        getTransactionData () {
            const transactionData = {
                address: this.currentWallet.address,
                username: this.form.username,
                mnemonic: this.form.mnemonic,
                fee: this.getFee(),
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.currentWallet.multiSignature
            };

            if (this.currentWallet.secondPublicKey) {
                transactionData.extraMnemonic = this.form.extraMnemonic;
            }

            return transactionData;
        },

        async buildTransaction (transactionData, isAdvancedFee = false, returnObject = false) {
            return this.$client.buildRegistration(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.REGISTRATION"));
        }
    },

    validations: {
        form: {
            fee: mixin.validators.fee,
            mnemonic: mixin.validators.mnemonic,
            walletPassword: mixin.validators.walletPassword,
            extraMnemonic: mixin.validators.extraMnemonic,

            username: {
                isValid (value) {
                    const validation = WalletService.validateUsername(value);

                    return validation.passes;
                },

                isNotEmpty (value) {
                    const validation = WalletService.validateUsername(value);

                    return !validation.passes ? !validation.errors.find(error => error.type === "empty") : true;
                },

                isMaxLength (value) {
                    const validation = WalletService.validateUsername(value);

                    return !validation.passes ? !validation.errors.find(error => error.type === "maxLength") : true;
                },

                doesNotExist (value) {
                    const validation = WalletService.validateUsername(value);

                    return !validation.passes ? !validation.errors.find(error => error.type === "exists") : true;
                }
            }
        }
    }
};
</script>
