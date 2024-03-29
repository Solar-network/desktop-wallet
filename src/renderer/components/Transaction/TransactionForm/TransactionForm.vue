<template>
  <Component
    :is="activeComponent"
    v-bind="$attrs"
    @cancel="emitCancel"
    @next="emitBuilt"
  />
</template>

<script>
/* eslint-disable vue/no-unused-components */
import { TRANSACTION_GROUPS } from "@config";
import TransactionFormRegistration from "./TransactionFormRegistration";
import TransactionFormResignationTemporary from "./TransactionFormResignationTemporary";
import TransactionFormResignationPermanent from "./TransactionFormResignationPermanent";
import TransactionFormResignationRevoke from "./TransactionFormResignationRevoke";
import TransactionFormIpfs from "./TransactionFormIpfs";
import TransactionFormMultiSign from "./TransactionFormMultiSign";
import TransactionFormMultiSignature from "./TransactionFormMultiSignature";
import TransactionFormTransfer from "./TransactionFormTransfer";
import TransactionFormVote from "./TransactionFormVote";
import TransactionFormExtraSignature from "./TransactionFormExtraSignature";

export default {
    name: "TransactionForm",

    components: {
        TransactionFormRegistration,
        TransactionFormResignationTemporary,
        TransactionFormResignationPermanent,
        TransactionFormResignationRevoke,
        TransactionFormIpfs,
        TransactionFormMultiSign,
        TransactionFormMultiSignature,
        TransactionFormTransfer,
        TransactionFormVote,
        TransactionFormExtraSignature
    },

    props: {
        group: {
            type: Number,
            required: false,
            default: TRANSACTION_GROUPS.STANDARD
        },

        meta: {
            type: Number,
            required: false,
            default: 0
        },

        type: {
            type: Number,
            required: true
        }
    },

    data: () => ({
        activeComponent: null
    }),

    // TODO: Fetch fees remotely
    mounted () {
        const group = this.type === -1 ? TRANSACTION_GROUPS.STANDARD : this.group;
        const component = Object.values(this.$options.components).find(component => {
            if ((component.transactionGroup || TRANSACTION_GROUPS.STANDARD) !== group) {
                return false;
            }

            if (group === TRANSACTION_GROUPS.STANDARD && component.transactionType === this.type && this.type === 7) {
                return component.meta === this.meta;
            } else {
                return component.transactionType === this.type;
            }
        });

        if (!component) {
            throw new Error(`[TransactionForm] - Form for type ${this.type} (group ${group}) not found.`);
        }

        this.activeComponent = component.name;
    },

    methods: {
        emitBuilt (transaction) {
            this.$emit("built", transaction);
        },

        emitCancel (reason) {
            this.$emit("cancel", reason);
        }
    }
};
</script>
