import { TRANSACTION_GROUPS, TRANSACTION_TYPES } from "@config";

const isStandardTypeGroup = typeGroup => {
    return typeGroup === TRANSACTION_GROUPS.STANDARD;
};

const isSolarTypeGroup = typeGroup => {
    return typeGroup === TRANSACTION_GROUPS.SOLAR;
};
export default {
    methods: {
        transaction_isTransfer (type, typeGroup) {
            return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.TRANSFER;
        },

        transaction_isExtraSignature (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.EXTRA_SIGNATURE
            );
        },

        transaction_isRegistration (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) &&
        type === TRANSACTION_TYPES.GROUP_1.REGISTRATION
            );
        },

        transaction_isLegacyVote (type, typeGroup) {
            return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.VOTE;
        },

        transaction_isVote (type, typeGroup) {
            return isSolarTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_2.VOTE;
        },

        transaction_isMultiSignature (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.MULTI_SIGNATURE
            );
        },

        transaction_isIpfs (type, typeGroup) {
            return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.IPFS;
        },

        transaction_isMultiPayment (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.MULTI_PAYMENT
            );
        },

        transaction_isResignation (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) &&
        type === TRANSACTION_TYPES.GROUP_1.RESIGNATION
            );
        },

        transaction_isTimelock (type, typeGroup) {
            return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_LOCK;
        },

        transaction_isTimelockClaim (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_CLAIM
            );
        },

        transaction_isTimelockRefund (type, typeGroup) {
            return (
                isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_REFUND
            );
        }
    }
};
