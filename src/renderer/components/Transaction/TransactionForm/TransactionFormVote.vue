<template>
  <div class="TransactionFormVote">
    <Collapse
      :is-open="!isPassphraseStep"
      class="TransactionFormVote__delegate-details"
    >
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
        <ListDividedItem
          v-if="Object.keys(votedDelegates).length"
          class="TransactionShow__Recipients"
          :label="$t('TRANSACTION.VOTES')"
          item-value-class="items-center"
        >
          <TransactionVotesList
            :title="null"
            :items="getVotes"
            :show-links="true"
            readonly
            @click="() => {}"
          />
        </ListDividedItem>
      </ListDivided>

      <button
        v-show="showVoteUnvoteButton"
        type="button"
        class="blue-button mt-5"
        @click="toggleStep"
      >
        {{ Object.keys(votedDelegates).length === 0 ? $t('WALLET_DELEGATES.UNVOTE') : $t('WALLET_DELEGATES.VOTE') }}
      </button>
    </Collapse>

    <Collapse :is-open="isPassphraseStep">
      <div class="mt-12">
        <InputFee
          ref="fee"
          :currency="walletNetwork.token"
          :transaction-type="$options.transactionType"
          :show-insufficient-funds="true"
          class="TransactionFormVote__fee"
          @input="onFee"
        />
      </div>

      <div v-if="!isMultiSignature">
        <div
          v-if="currentWallet.isLedger"
          class="TransactionFormVote__ledger-notice mt-10"
        >
          {{ $t('TRANSACTION.LEDGER_SIGN_NOTICE') }}
        </div>

        <InputPassword
          v-else-if="currentWallet.passphrase"
          ref="password"
          v-model="$v.form.walletPassword.$model"
          :label="$t('TRANSACTION.PASSWORD')"
          :is-required="true"
          class="TransactionFormVote__password mt-4"
        />

        <PassphraseInput
          v-else
          ref="passphrase"
          v-model="$v.form.passphrase.$model"
          :address="currentWallet.address"
          :pub-key-hash="walletNetwork.version"
          class="TransactionFormVote__passphrase mt-4"
        />
      </div>

      <PassphraseInput
        v-if="currentWallet.secondPublicKey"
        ref="secondPassphrase"
        v-model="$v.form.secondPassphrase.$model"
        :label="$t('TRANSACTION.SECOND_PASSPHRASE')"
        :pub-key-hash="walletNetwork.version"
        :public-key="currentWallet.secondPublicKey"
        class="TransactionFormVote__second-passphrase mt-5"
      />

      <button
        :disabled="$v.form.$invalid"
        type="button"
        class="TransactionFormVote__next blue-button mt-5"
        @click="onSubmit"
      >
        {{ $t('COMMON.NEXT') }}
      </button>
    </Collapse>

    <ModalLoader
      ref="modalLoader"
      :message="$t('ENCRYPTION.DECRYPTING')"
      :visible="showEncryptLoader"
    />
    <ModalLoader
      :message="$t('TRANSACTION.LEDGER_SIGN_WAIT')"
      :visible="showLedgerLoader"
    />
  </div>
</template>

<script>
import { TRANSACTION_TYPES } from "@config";
import { Collapse } from "@/components/Collapse";
import { InputFee, InputPassword } from "@/components/Input";
import { ListDivided, ListDividedItem } from "@/components/ListDivided";
import TransactionVotesList from "@/components/Transaction/TransactionVotesList";
import { ModalLoader } from "@/components/Modal";
import { PassphraseInput } from "@/components/Passphrase";
import mixin from "./mixin";

export default {
    name: "TransactionFormVote",

    transactionType: TRANSACTION_TYPES.GROUP_1.VOTE,

    components: {
        Collapse,
        InputFee,
        InputPassword,
        ListDivided,
        ListDividedItem,
        ModalLoader,
        PassphraseInput,
        TransactionVotesList
    },

    mixins: [mixin],

    props: {
        votedDelegates: {
            type: Object,
            required: false,
            default: null
        }
    },

    data: () => ({
        isPassphraseStep: false,
        form: {
            fee: 0,
            passphrase: "",
            walletPassword: ""
        }
    }),

    computed: {
        getVotes () {
            return Object.entries(this.votedDelegates).map(vote => ({ address: this.$store.getters["delegate/byUsername"](vote[0]).address, delegate: vote[0], percent: vote[1] / 100 }));
        },

        showVoteUnvoteButton () {
            if (this.currentWallet.isContact) {
                return false;
            }

            return true;
        }
    },

    watch: {
        isPassphraseStep () {
            // Ignore Ledger wallets
            if (this.currentWallet.isLedger || this.isMultiSignature) {
                return;
            }

            // The passphrase is stored: focus on the custom password input
            if (this.currentWallet.passphrase) {
                this.$refs.password.focus();
            } else {
                this.$refs.passphrase.focus();
            }
        }
    },

    methods: {
        getTransactionData () {
            const votes = {};
            for (const delegate in this.votedDelegates) {
                votes[delegate] = this.votedDelegates[delegate] / 100;
            }
            const transactionData = {
                address: this.currentWallet.address,
                passphrase: this.form.passphrase,
                votes,
                fee: this.getFee(),
                wif: this.form.wif,
                networkWif: this.walletNetwork.wif,
                multiSignature: this.currentWallet.multiSignature
            };

            if (this.currentWallet.secondPublicKey) {
                transactionData.secondPassphrase = this.form.secondPassphrase;
            }

            return transactionData;
        },

        async buildTransaction (transactionData, isAdvancedFee = false, returnObject = false) {
            return this.$client.buildVote(transactionData, isAdvancedFee, returnObject);
        },

        transactionError () {
            this.$error(this.$t("TRANSACTION.ERROR.VALIDATION.VOTE"));
        },

        postSubmit () {
            this.reset();
        },

        toggleStep () {
            this.isPassphraseStep = !this.isPassphraseStep;
        },

        reset () {
            this.isPassphraseStep = false;
            if (!this.isMultiSignature) {
                if (!this.currentWallet.passphrase && !this.currentWallet.isLedger) {
                    this.$set(this.form, "passphrase", "");
                    this.$refs.passphrase.reset();
                } else if (!this.currentWallet.isLedger) {
                    this.$set(this.form, "walletPassword", "");
                    this.$refs.password.reset();
                }
            }
            this.$v.$reset();
        },

        emitCancel () {
            this.$emit("cancel", "navigateToTransactions");
        }
    },

    validations: {
        form: {
            fee: mixin.validators.fee,
            passphrase: mixin.validators.passphrase,
            walletPassword: mixin.validators.walletPassword,
            secondPassphrase: mixin.validators.secondPassphrase
        }
    }
};
</script>

<style scoped>
.TransactionFormVote {
  min-width: 29em;
}

.TransactionFormVote /deep/ .Collapse__handler {
  display: none
}
</style>
