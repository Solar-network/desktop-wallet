import { ResignationBuilder } from "./resignation.builder";
import { MultiPaymentBuilder } from "./multi-payment.builder";
import { IpfsBuilder } from "./ipfs.builder";
import { MultiSignatureBuilder } from "./multi-signature.builder";
import { ExtraSignatureRegistrationBuilder } from "./extra-signature-registration.builder";
import { TransferBuilder } from "./transfer.builder";
import { RegistrationBuilder } from "./registration.builder";
import { VoteBuilder } from "./vote.builder";

export class TransactionBuilderService {
    static async buildTransfer (data, isAdvancedFee = false, returnObject = false) {
        return TransferBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildExtraSignatureRegistration (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return ExtraSignatureRegistrationBuilder.build(
            data,
            isAdvancedFee,
            returnObject
        );
    }

    static async buildRegistration (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return RegistrationBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildVote (data, isAdvancedFee = false, returnObject = false) {
        return VoteBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildMultiSignature (data, isAdvancedFee = false, returnObject = false) {
        return MultiSignatureBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildIpfs (data, isAdvancedFee = false, returnObject = false) {
        return IpfsBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildMultiPayment (data, isAdvancedFee = false, returnObject = false) {
        return MultiPaymentBuilder.build(data, isAdvancedFee, returnObject);
    }

    static async buildResignation (
        data,
        isAdvancedFee = false,
        returnObject = false
    ) {
        return ResignationBuilder.build(data, isAdvancedFee, returnObject);
    }
}
