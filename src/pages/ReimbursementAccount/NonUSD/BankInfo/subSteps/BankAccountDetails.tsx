import React, {useCallback, useMemo} from 'react';
import {ActivityIndicator, View} from 'react-native';
import {useOnyx} from 'react-native-onyx';
import FormProvider from '@components/Form/FormProvider';
import InputWrapper from '@components/Form/InputWrapper';
import type {FormInputErrors, FormOnyxKeys, FormOnyxValues} from '@components/Form/types';
import Text from '@components/Text';
import TextInput from '@components/TextInput';
import useLocalize from '@hooks/useLocalize';
import useReimbursementAccountStepFormSubmit from '@hooks/useReimbursementAccountStepFormSubmit';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import type {BankInfoSubStepProps} from '@pages/ReimbursementAccount/NonUSD/BankInfo/types';
import {getBankInfoStepValues} from '@pages/ReimbursementAccount/NonUSD/utils/getBankInfoStepValues';
import getInputForValueSet from '@pages/ReimbursementAccount/NonUSD/utils/getInputForValueSet';
import CONST from '@src/CONST';
import ONYXKEYS from '@src/ONYXKEYS';
import type {ReimbursementAccountForm} from '@src/types/form';

function BankAccountDetails({onNext, isEditing, corpayFields}: BankInfoSubStepProps) {
    const {translate} = useLocalize();
    const styles = useThemeStyles();
    const theme = useTheme();
    const [reimbursementAccount] = useOnyx(ONYXKEYS.REIMBURSEMENT_ACCOUNT);
    const [reimbursementAccountDraft] = useOnyx(ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM_DRAFT);

    const bankAccountDetailsFields = useMemo(() => {
        return corpayFields?.formFields?.filter((field) => !field.id.includes(CONST.NON_USD_BANK_ACCOUNT.BANK_INFO_STEP_ACCOUNT_HOLDER_KEY_PREFIX));
    }, [corpayFields]);

    const subStepKeys = bankAccountDetailsFields?.reduce((acc, field) => {
        acc[field.id as keyof ReimbursementAccountForm] = field.id as keyof ReimbursementAccountForm;
        return acc;
    }, {} as Record<keyof ReimbursementAccountForm, keyof ReimbursementAccountForm>);

    const defaultValues = useMemo(
        () => getBankInfoStepValues(subStepKeys ?? {}, reimbursementAccountDraft, reimbursementAccount),
        [reimbursementAccount, reimbursementAccountDraft, subStepKeys],
    );

    const fieldIds = bankAccountDetailsFields?.map((field) => field.id);

    const validate = useCallback(
        (values: FormOnyxValues<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM>): FormInputErrors<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM> => {
            const errors: FormInputErrors<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM> = {};

            corpayFields?.formFields?.forEach((field) => {
                const fieldID = field.id as keyof FormOnyxValues<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM>;

                if (field.isRequired && !values[fieldID]) {
                    errors[fieldID] = translate('common.error.fieldRequired');
                }

                field.validationRules.forEach((rule) => {
                    if (!rule.regEx) {
                        return;
                    }

                    if (new RegExp(rule.regEx).test(values[fieldID] ? String(values[fieldID]) : '')) {
                        return;
                    }

                    errors[fieldID] = rule.errorMessage;
                });
            });

            return errors;
        },
        [corpayFields, translate],
    );

    const handleSubmit = useReimbursementAccountStepFormSubmit({
        fieldIds: fieldIds as Array<FormOnyxKeys<typeof ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM>>,
        onNext,
        shouldSaveDraft: isEditing,
    });

    const inputs = useMemo(() => {
        return bankAccountDetailsFields?.map((field) => {
            if (field.valueSet !== undefined) {
                return getInputForValueSet(field, String(defaultValues[field.id as keyof typeof defaultValues]), isEditing, styles);
            }

            return (
                <View
                    style={styles.mb6}
                    key={field.id}
                >
                    <InputWrapper
                        InputComponent={TextInput}
                        inputID={field.id}
                        label={field.label}
                        aria-label={field.label}
                        role={CONST.ROLE.PRESENTATION}
                        shouldSaveDraft={!isEditing}
                        defaultValue={String(defaultValues[field.id as keyof typeof defaultValues]) ?? ''}
                    />
                </View>
            );
        });
    }, [bankAccountDetailsFields, styles, isEditing, defaultValues]);

    return (
        <FormProvider
            formID={ONYXKEYS.FORMS.REIMBURSEMENT_ACCOUNT_FORM}
            submitButtonText={translate(isEditing ? 'common.confirm' : 'common.next')}
            onSubmit={handleSubmit}
            validate={validate}
            style={[styles.mh5, styles.flexGrow1]}
            isSubmitDisabled={!inputs}
            shouldHideFixErrorsAlert={(bankAccountDetailsFields?.length ?? 0) <= 1}
        >
            <>
                <Text style={[styles.textHeadlineLineHeightXXL, styles.mb6]}>{translate('bankInfoStep.whatAreYour')}</Text>
                {corpayFields?.isLoading ? (
                    <View style={[styles.flexGrow4, styles.alignItemsCenter]}>
                        <ActivityIndicator
                            size={CONST.ACTIVITY_INDICATOR_SIZE.LARGE}
                            color={theme.spinner}
                            style={styles.flexGrow1}
                        />
                    </View>
                ) : (
                    inputs
                )}
            </>
        </FormProvider>
    );
}

BankAccountDetails.displayName = 'BankAccountDetails';

export default BankAccountDetails;
