import { TRANSACTION_GROUPS, TRANSACTION_TYPES } from '@config'

const isStandardTypeGroup = typeGroup => {
  return typeGroup === TRANSACTION_GROUPS.STANDARD
}

export default {
  methods: {
    transaction_isTransfer (type, typeGroup) {
      return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.TRANSFER
    },

    transaction_isSecondSignature (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.SECOND_SIGNATURE
      )
    },

    transaction_isDelegateRegistration (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) &&
        type === TRANSACTION_TYPES.GROUP_1.DELEGATE_REGISTRATION
      )
    },

    transaction_isVote (type, typeGroup) {
      return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.VOTE
    },

    transaction_isMultiSignature (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.MULTI_SIGNATURE
      )
    },

    transaction_isIpfs (type, typeGroup) {
      return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.IPFS
    },

    transaction_isMultiPayment (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.MULTI_PAYMENT
      )
    },

    transaction_isDelegateResignation (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) &&
        type === TRANSACTION_TYPES.GROUP_1.DELEGATE_RESIGNATION
      )
    },

    transaction_isTimelock (type, typeGroup) {
      return isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_LOCK
    },

    transaction_isTimelockClaim (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_CLAIM
      )
    },

    transaction_isTimelockRefund (type, typeGroup) {
      return (
        isStandardTypeGroup(typeGroup) && type === TRANSACTION_TYPES.GROUP_1.HTLC_REFUND
      )
    }
  }
}
