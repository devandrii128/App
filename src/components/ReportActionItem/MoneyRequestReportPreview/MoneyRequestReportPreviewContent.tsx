import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {FlatList, View} from 'react-native';
import type {LayoutChangeEvent, ListRenderItemInfo, ViewToken} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withDelay, withSpring, withTiming} from 'react-native-reanimated';
import type {LayoutRectangle} from 'react-native/Libraries/Types/CoreEventTypes';
import Button from '@components/Button';
import {getButtonRole} from '@components/Button/utils';
import DelegateNoAccessModal from '@components/DelegateNoAccessModal';
import Icon from '@components/Icon';
import * as Expensicons from '@components/Icon/Expensicons';
import ImageSVG from '@components/ImageSVG';
import OfflineWithFeedback from '@components/OfflineWithFeedback';
import {PressableWithFeedback} from '@components/Pressable';
import PressableWithoutFeedback from '@components/Pressable/PressableWithoutFeedback';
import ProcessMoneyReportHoldMenu from '@components/ProcessMoneyReportHoldMenu';
import type {ActionHandledType} from '@components/ProcessMoneyReportHoldMenu';
import ExportWithDropdownMenu from '@components/ReportActionItem/ExportWithDropdownMenu';
import AnimatedSettlementButton from '@components/SettlementButton/AnimatedSettlementButton';
import {showContextMenuForReport} from '@components/ShowContextMenuContext';
import Text from '@components/Text';
import useLocalize from '@hooks/useLocalize';
import useNetwork from '@hooks/useNetwork';
import usePaymentAnimations from '@hooks/usePaymentAnimations';
import useResponsiveLayout from '@hooks/useResponsiveLayout';
import useStyleUtils from '@hooks/useStyleUtils';
import useTheme from '@hooks/useTheme';
import useThemeStyles from '@hooks/useThemeStyles';
import ControlSelection from '@libs/ControlSelection';
import {canUseTouchScreen} from '@libs/DeviceCapabilities';
import {getIOUReportPreviewButtonType, getTotalAmountForIOUReportPreviewButton, IOU_REPORT_PREVIEW_BUTTON} from '@libs/MoneyRequestReportUtils';
import type {RootNavigatorParamList, State} from '@libs/Navigation/types';
import {getConnectedIntegration} from '@libs/PolicyUtils';
import {getOriginalMessage, isActionOfType} from '@libs/ReportActionsUtils';
import {
    areAllRequestsBeingSmartScanned as areAllRequestsBeingSmartScannedReportUtils,
    canBeExported,
    getBankAccountRoute,
    getDisplayNameForParticipant,
    getInvoicePayerName,
    getMoneyRequestSpendBreakdown,
    getNonHeldAndFullAmount,
    getPolicyName,
    getTransactionsWithReceipts,
    hasActionsWithErrors,
    hasHeldExpenses as hasHeldExpensesReportUtils,
    hasMissingSmartscanFields as hasMissingSmartscanFieldsReportUtils,
    hasNonReimbursableTransactions as hasNonReimbursableTransactionsReportUtils,
    hasNoticeTypeViolations,
    hasOnlyHeldExpenses as hasOnlyHeldExpensesReportUtils,
    hasOnlyTransactionsWithPendingRoutes as hasOnlyTransactionsWithPendingRoutesReportUtils,
    hasReportViolations,
    hasUpdatedTotal,
    hasViolations,
    hasWarningTypeViolations,
    isAllowedToApproveExpenseReport,
    isAllowedToSubmitDraftExpenseReport,
    isInvoiceReport as isInvoiceReportUtils,
    isInvoiceRoom as isInvoiceRoomReportUtils,
    isPolicyExpenseChat as isPolicyExpenseChatReportUtils,
    isReportApproved,
    isReportOwner,
    isSettled,
    isTripRoom as isTripRoomReportUtils,
    isWaitingForSubmissionFromCurrentUser as isWaitingForSubmissionFromCurrentUserReportUtils,
} from '@libs/ReportUtils';
import {getMerchant, hasPendingUI, isCardTransaction, isPartialMerchant, isPending, shouldShowBrokenConnectionViolationForMultipleTransactions} from '@libs/TransactionUtils';
import navigationRef from '@navigation/navigationRef';
import colors from '@styles/theme/colors';
import variables from '@styles/variables';
import {approveMoneyRequest, canApproveIOU, canIOUBePaid as canIOUBePaidIOUActions, canSubmitReport, payInvoice, payMoneyRequest, submitReport} from '@userActions/IOU';
import CONST from '@src/CONST';
import type {TranslationPaths} from '@src/languages/types';
import NAVIGATORS from '@src/NAVIGATORS';
import ROUTES from '@src/ROUTES';
import type {Transaction} from '@src/types/onyx';
import type {PaymentMethodType} from '@src/types/onyx/OriginalMessage';
import type {MoneyRequestReportPreviewContentProps} from './types';

type WebLayoutNativeEvent = {
    layout: LayoutRectangle;
    target: Element;
};

const checkIfReportNameOverflows = <T extends LayoutChangeEvent>({nativeEvent}: T) =>
    'target' in nativeEvent ? (nativeEvent as WebLayoutNativeEvent).target.scrollHeight > variables.h70 : false;

// Do not remove this empty view, it is a workaround for the icon padding at the end of the preview text
const FixIconPadding = <View style={{height: variables.iconSizeNormal}} />;

function MoneyRequestReportPreviewContent({
    iouReportID,
    policyID,
    chatReportID,
    action,
    containerStyles,
    contextMenuAnchor,
    isHovered = false,
    isWhisper = false,
    checkIfContextMenuActive = () => {},
    onPaymentOptionsShow,
    onPaymentOptionsHide,
    chatReport,
    invoiceReceiverPolicy,
    iouReport,
    transactions,
    violations,
    policy,
    invoiceReceiverPersonalDetail,
    lastTransactionViolations,
    isDelegateAccessRestricted,
    renderItem,
    getCurrentWidth,
    reportPreviewStyles,
    shouldDisplayContextMenu = true,
    isInvoice,
}: MoneyRequestReportPreviewContentProps) {
    const lastTransaction = transactions?.at(0);
    const transactionIDList = transactions?.map((reportTransaction) => reportTransaction.transactionID) ?? [];
    const theme = useTheme();
    const styles = useThemeStyles();
    const StyleUtils = useStyleUtils();
    const {translate} = useLocalize();
    const {isOffline} = useNetwork();
    const {shouldUseNarrowLayout} = useResponsiveLayout();
    const rootState = navigationRef.getRootState() as State<RootNavigatorParamList>;
    const isSearchFullscreen = rootState?.routes.at(-1)?.name === NAVIGATORS.SEARCH_FULLSCREEN_NAVIGATOR;

    const [doesReportNameOverflow, setDoesReportNameOverflow] = useState(false);

    const {hasMissingSmartscanFields, areAllRequestsBeingSmartScanned, hasNonReimbursableTransactions} = useMemo(
        () => ({
            hasMissingSmartscanFields: hasMissingSmartscanFieldsReportUtils(iouReportID),
            areAllRequestsBeingSmartScanned: areAllRequestsBeingSmartScannedReportUtils(iouReportID, action),
            hasOnlyTransactionsWithPendingRoutes: hasOnlyTransactionsWithPendingRoutesReportUtils(iouReportID),
            hasNonReimbursableTransactions: hasNonReimbursableTransactionsReportUtils(iouReportID),
        }),
        // When transactions get updated these values may have changed, so that is a case where we also want to recompute them
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
        [transactions, iouReportID, action],
    );

    const {isPaidAnimationRunning, isApprovedAnimationRunning, stopAnimation, startAnimation, startApprovedAnimation} = usePaymentAnimations();
    const [isHoldMenuVisible, setIsHoldMenuVisible] = useState(false);
    const [requestType, setRequestType] = useState<ActionHandledType>();
    const [paymentType, setPaymentType] = useState<PaymentMethodType>();

    const getCanIOUBePaid = useCallback(
        (shouldShowOnlyPayElsewhere = false, shouldCheckApprovedState = true) =>
            canIOUBePaidIOUActions(iouReport, chatReport, policy, transactions, shouldShowOnlyPayElsewhere, undefined, undefined, shouldCheckApprovedState),
        [iouReport, chatReport, policy, transactions],
    );

    const canIOUBePaid = useMemo(() => getCanIOUBePaid(), [getCanIOUBePaid]);
    const canIOUBePaidAndApproved = useMemo(() => getCanIOUBePaid(false, false), [getCanIOUBePaid]);
    const connectedIntegration = getConnectedIntegration(policy);
    const hasOnlyHeldExpenses = hasOnlyHeldExpensesReportUtils(iouReport?.reportID);

    const managerID = iouReport?.managerID ?? action.childManagerAccountID ?? CONST.DEFAULT_NUMBER_ID;
    const {totalDisplaySpend} = getMoneyRequestSpendBreakdown(iouReport);

    const iouSettled = isSettled(iouReportID) || action?.childStatusNum === CONST.REPORT.STATUS_NUM.REIMBURSED;
    const previewMessageOpacity = useSharedValue(1);
    const previewMessageStyle = useAnimatedStyle(() => ({
        opacity: previewMessageOpacity.get(),
    }));
    const checkMarkScale = useSharedValue(iouSettled ? 1 : 0);

    const isApproved = isReportApproved({report: iouReport, parentReportAction: action});
    const thumbsUpScale = useSharedValue(isApproved ? 1 : 0);

    const isPolicyExpenseChat = isPolicyExpenseChatReportUtils(chatReport);
    const isInvoiceRoom = isInvoiceRoomReportUtils(chatReport);
    const isTripRoom = isTripRoomReportUtils(chatReport);

    const canAllowSettlement = hasUpdatedTotal(iouReport, policy);
    const numberOfRequests = transactions?.length ?? 0;
    const transactionsWithReceipts = getTransactionsWithReceipts(iouReportID);
    const numberOfPendingRequests = transactionsWithReceipts.filter((transaction) => isPending(transaction) && isCardTransaction(transaction)).length;

    const shouldShowRTERViolationMessage = numberOfRequests === 1 && hasPendingUI(lastTransaction, lastTransactionViolations);
    const shouldShowBrokenConnectionViolation = numberOfRequests === 1 && shouldShowBrokenConnectionViolationForMultipleTransactions(transactionIDList, iouReport, policy, violations);
    const shouldShowOnlyPayElsewhere = useMemo(() => !canIOUBePaid && getCanIOUBePaid(true), [canIOUBePaid, getCanIOUBePaid]);

    const hasReceipts = transactionsWithReceipts.length > 0;
    const isScanning = hasReceipts && areAllRequestsBeingSmartScanned;
    const hasErrors =
        (hasMissingSmartscanFields && !iouSettled) ||
        // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
        hasViolations(iouReportID, violations, true) ||
        hasNoticeTypeViolations(iouReportID, violations, true) ||
        hasWarningTypeViolations(iouReportID, violations, true) ||
        (isReportOwner(iouReport) && hasReportViolations(iouReportID)) ||
        hasActionsWithErrors(iouReportID);
    let formattedMerchant = numberOfRequests === 1 ? getMerchant(lastTransaction) : undefined;

    if (isPartialMerchant(formattedMerchant ?? '')) {
        formattedMerchant = undefined;
    }

    const isAdmin = policy?.role === CONST.POLICY.ROLE.ADMIN;
    const filteredTransactions = transactions?.filter((transaction) => transaction) ?? [];

    // The submit button should be success green colour only if the user is submitter and the policy does not have Scheduled Submit turned on
    const isWaitingForSubmissionFromCurrentUser = useMemo(() => isWaitingForSubmissionFromCurrentUserReportUtils(chatReport, policy), [chatReport, policy]);

    const [isNoDelegateAccessMenuVisible, setIsNoDelegateAccessMenuVisible] = useState(false);

    const confirmPayment = useCallback(
        (type: PaymentMethodType | undefined, payAsBusiness?: boolean) => {
            if (!type) {
                return;
            }
            setPaymentType(type);
            setRequestType(CONST.IOU.REPORT_ACTION_TYPE.PAY);
            if (isDelegateAccessRestricted) {
                setIsNoDelegateAccessMenuVisible(true);
            } else if (hasHeldExpensesReportUtils(iouReport?.reportID)) {
                setIsHoldMenuVisible(true);
            } else if (chatReport && iouReport) {
                startAnimation();
                if (isInvoiceReportUtils(iouReport)) {
                    payInvoice(type, chatReport, iouReport, payAsBusiness);
                } else {
                    payMoneyRequest(type, chatReport, iouReport);
                }
            }
        },
        [chatReport, iouReport, isDelegateAccessRestricted, startAnimation],
    );

    const confirmApproval = () => {
        setRequestType(CONST.IOU.REPORT_ACTION_TYPE.APPROVE);
        if (isDelegateAccessRestricted) {
            setIsNoDelegateAccessMenuVisible(true);
        } else if (hasHeldExpensesReportUtils(iouReport?.reportID)) {
            setIsHoldMenuVisible(true);
        } else {
            startApprovedAnimation();
            approveMoneyRequest(iouReport, true);
        }
    };

    const shouldShowPayButton = isPaidAnimationRunning || canIOUBePaid || shouldShowOnlyPayElsewhere;
    const shouldShowApproveButton = useMemo(() => canApproveIOU(iouReport, policy), [iouReport, policy]) || isApprovedAnimationRunning;
    const shouldShowSubmitButton = canSubmitReport(iouReport, policy, filteredTransactions, violations);
    const shouldShowSettlementButton = !shouldShowSubmitButton && (shouldShowPayButton || shouldShowApproveButton) && !shouldShowRTERViolationMessage && !shouldShowBrokenConnectionViolation;
    const shouldShowRBR = hasErrors && !iouSettled;
    const shouldShowExportIntegrationButton = !shouldShowPayButton && !shouldShowSubmitButton && !!connectedIntegration && isAdmin && canBeExported(iouReport);

    const buttonType = getIOUReportPreviewButtonType({
        shouldShowPayButton,
        shouldShowApproveButton,
        shouldShowSubmitButton,
        shouldShowSettlementButton,
        shouldShowRBR,
        shouldShowExportIntegrationButton,
    });

    const shouldDisableSubmitButton = shouldShowSubmitButton && !isAllowedToSubmitDraftExpenseReport(iouReport);
    const shouldDisableApproveButton = shouldShowApproveButton && !isAllowedToApproveExpenseReport(iouReport);

    const previewMessage = useMemo(() => {
        if (isScanning) {
            return totalDisplaySpend ? `${translate('common.receipt')} ${CONST.DOT_SEPARATOR} ${translate('common.scanning')}` : `${translate('common.receipt')}`;
        }
        if (numberOfPendingRequests === 1 && numberOfRequests === 1) {
            return `${translate('common.receipt')} ${CONST.DOT_SEPARATOR} ${translate('iou.pending')}`;
        }
        if (shouldShowRTERViolationMessage) {
            return `${translate('common.receipt')} ${CONST.DOT_SEPARATOR} ${translate('iou.pendingMatch')}`;
        }

        let payerOrApproverName;
        if (isPolicyExpenseChat || isTripRoom) {
            payerOrApproverName = getPolicyName({report: chatReport, policy});
        } else if (isInvoiceRoom) {
            payerOrApproverName = getInvoicePayerName(chatReport, invoiceReceiverPolicy, invoiceReceiverPersonalDetail);
        } else {
            payerOrApproverName = getDisplayNameForParticipant({accountID: managerID, shouldUseShortForm: true});
        }

        if (isApproved) {
            return translate('iou.managerApproved', {manager: payerOrApproverName});
        }
        let paymentVerb: TranslationPaths = 'iou.payerOwes';
        if (iouSettled || iouReport?.isWaitingOnBankAccount) {
            paymentVerb = 'iou.payerPaid';
        } else if (hasNonReimbursableTransactions) {
            paymentVerb = 'iou.payerSpent';
            payerOrApproverName = getDisplayNameForParticipant({accountID: chatReport?.ownerAccountID, shouldUseShortForm: true});
        }
        return translate(paymentVerb, {payer: payerOrApproverName});
    }, [
        isScanning,
        numberOfPendingRequests,
        numberOfRequests,
        shouldShowRTERViolationMessage,
        isPolicyExpenseChat,
        isTripRoom,
        isInvoiceRoom,
        isApproved,
        iouSettled,
        iouReport?.isWaitingOnBankAccount,
        hasNonReimbursableTransactions,
        translate,
        totalDisplaySpend,
        chatReport,
        policy,
        invoiceReceiverPolicy,
        invoiceReceiverPersonalDetail,
        managerID,
    ]);

    const bankAccountRoute = getBankAccountRoute(chatReport);

    const {nonHeldAmount, fullAmount, hasValidNonHeldAmount} = getNonHeldAndFullAmount(iouReport, shouldShowPayButton);

    /*
     Show subtitle if at least one of the expenses is not being smart scanned, and either:
     - There is more than one expense – in this case, the "X expenses, Y scanning" subtitle is shown;
     - There is only one expense, it has a receipt and is not being smart scanned – in this case, the expense merchant or description is shown;

     * There is an edge case when there is only one distance expense with a pending route and amount = 0.
       In this case, we don't want to show the merchant or description because it says: "Pending route...", which is already displayed in the amount field.
     */
    const {supportText} = useMemo(() => {
        if (numberOfRequests === 1) {
            return {
                supportText: '',
            };
        }
        return {
            supportText: translate('iou.expenseCount', {
                count: numberOfRequests,
            }),
        };
    }, [translate, numberOfRequests]);

    useEffect(() => {
        if (!isPaidAnimationRunning || isApprovedAnimationRunning) {
            return;
        }

        previewMessageOpacity.set(
            withTiming(0.75, {duration: CONST.ANIMATION_PAID_DURATION / 2}, () => {
                previewMessageOpacity.set(withTiming(1, {duration: CONST.ANIMATION_PAID_DURATION / 2}));
            }),
        );
        // We only want to animate the text when the text changes
        // eslint-disable-next-line react-compiler/react-compiler, react-hooks/exhaustive-deps
    }, [previewMessage, previewMessageOpacity]);

    useEffect(() => {
        if (!iouSettled) {
            return;
        }

        checkMarkScale.set(isPaidAnimationRunning ? withDelay(CONST.ANIMATION_PAID_CHECKMARK_DELAY, withSpring(1, {duration: CONST.ANIMATION_PAID_DURATION})) : 1);
    }, [isPaidAnimationRunning, iouSettled, checkMarkScale]);

    useEffect(() => {
        if (!isApproved) {
            return;
        }

        thumbsUpScale.set(isApprovedAnimationRunning ? withDelay(CONST.ANIMATION_THUMBSUP_DELAY, withSpring(1, {duration: CONST.ANIMATION_THUMBSUP_DURATION})) : 1);
    }, [isApproved, isApprovedAnimationRunning, thumbsUpScale]);

    const [currentIndex, setCurrentIndex] = useState(0);
    const [lastVisibleIndex, setLastVisibleIndex] = useState(0);
    const carouselRef = useRef<FlatList<Transaction> | null>(null);
    const viewabilityConfig = useMemo(() => {
        return {itemVisiblePercentThreshold: 90};
    }, []);

    // eslint-disable-next-line react-compiler/react-compiler
    const onViewableItemsChanged = useRef(({viewableItems}: {viewableItems: ViewToken[]; changed: ViewToken[]}) => {
        const newIndex = viewableItems.at(0)?.index;
        const lastIndex = viewableItems.at(viewableItems.length - 1)?.index;
        if (typeof newIndex === 'number') {
            setCurrentIndex(newIndex);
        }
        if (typeof lastIndex === 'number') {
            setLastVisibleIndex(lastIndex);
        }
    }).current;

    const handleChange = (index: number) => {
        if (index >= transactions.length || index < 0) {
            return;
        }
        carouselRef.current?.scrollToIndex({index, animated: true, viewOffset: 2 * styles.gap2.gap});
    };

    const onTextLayoutChange = (e: LayoutChangeEvent) => {
        const doesOverflow = checkIfReportNameOverflows(e);
        if (doesOverflow !== doesReportNameOverflow) {
            setDoesReportNameOverflow(doesOverflow);
        }
    };

    const renderFlatlistItem = (itemInfo: ListRenderItemInfo<Transaction>) => {
        if (itemInfo.index > 9) {
            return (
                <View style={[styles.flex1, styles.p5, styles.justifyContentCenter]}>
                    <Text style={{color: colors.blue600}}>
                        +{transactions.length - 10} {translate('common.more').toLowerCase()}
                    </Text>
                </View>
            );
        }
        return renderItem(itemInfo);
    };

    // The button should expand up to transaction width
    const buttonMaxWidth = !shouldUseNarrowLayout ? {maxWidth: reportPreviewStyles.transactionPreviewStyle.width} : {};

    const approvedOrSettledicon = (iouSettled || isApproved) && (
        <ImageSVG
            src={isApproved ? Expensicons.ThumbsUp : Expensicons.Checkmark}
            fill={isApproved ? theme.icon : theme.iconSuccessFill}
            width={variables.iconSizeNormal}
            height={variables.iconSizeNormal}
            style={{transform: 'translateY(4px)'}}
            contentFit="cover"
        />
    );

    const getPreviewName = () => {
        if (isInvoice && isActionOfType(action, CONST.REPORT.ACTIONS.TYPE.REPORT_PREVIEW)) {
            const originalMessage = getOriginalMessage(action);
            return originalMessage && translate('iou.invoiceReportName', originalMessage);
        }
        return action.childReportName;
    };

    return (
        transactions.length > 0 && (
            <OfflineWithFeedback
                pendingAction={iouReport?.pendingFields?.preview}
                shouldDisableOpacity={!!(action.pendingAction ?? action.isOptimisticAction)}
                needsOffscreenAlphaCompositing
                style={styles.mt1}
            >
                <View
                    style={[styles.chatItemMessage, containerStyles]}
                    onLayout={getCurrentWidth}
                >
                    <PressableWithoutFeedback
                        onPress={() => {}}
                        onPressIn={() => canUseTouchScreen() && ControlSelection.block()}
                        onPressOut={() => ControlSelection.unblock()}
                        onLongPress={(event) => {
                            if (!shouldDisplayContextMenu) {
                                return;
                            }
                            showContextMenuForReport(event, contextMenuAnchor, chatReportID, action, checkIfContextMenuActive);
                        }}
                        shouldUseHapticsOnLongPress
                        style={[
                            styles.flexRow,
                            styles.justifyContentBetween,
                            StyleUtils.getBackgroundColorStyle(theme.cardBG),
                            isSearchFullscreen ? styles.borderedContentCardLarge : styles.reportContainerBorderRadius,
                        ]}
                        role={getButtonRole(true)}
                        isNested
                        accessibilityLabel={translate('iou.viewDetails')}
                    >
                        <View
                            style={[
                                StyleUtils.getBackgroundColorStyle(theme.cardBG),
                                styles.reportContainerBorderRadius,
                                styles.w100,
                                (isHovered || isScanning || isWhisper) && styles.reportPreviewBoxHoverBorder,
                            ]}
                        >
                            <View style={[reportPreviewStyles.wrapperStyle]}>
                                <View style={[reportPreviewStyles.contentContainerStyle]}>
                                    <View style={[styles.expenseAndReportPreviewTextContainer, styles.overflowHidden]}>
                                        <View style={[styles.flexRow, styles.justifyContentBetween, styles.gap3, StyleUtils.getMinimumHeight(variables.h28)]}>
                                            <View style={[styles.flexRow, styles.mw100, styles.flexShrink1]}>
                                                <Animated.View style={[styles.flexRow, styles.alignItemsCenter, previewMessageStyle, styles.flexShrink1]}>
                                                    <Text
                                                        onLayout={onTextLayoutChange}
                                                        style={[styles.lh20]}
                                                        numberOfLines={3}
                                                    >
                                                        {FixIconPadding}
                                                        <Text
                                                            style={[styles.headerText]}
                                                            testID="MoneyRequestReportPreview-reportName"
                                                        >
                                                            {getPreviewName()}
                                                        </Text>
                                                        {!doesReportNameOverflow && <>&nbsp;{approvedOrSettledicon}</>}
                                                    </Text>
                                                    {doesReportNameOverflow && (
                                                        <View style={[styles.mtn0Half, (transactions.length < 3 || shouldUseNarrowLayout) && styles.alignSelfStart]}>
                                                            {approvedOrSettledicon}
                                                        </View>
                                                    )}
                                                </Animated.View>
                                            </View>
                                            {!shouldUseNarrowLayout && transactions.length > 2 && (
                                                <View style={[styles.flexRow, styles.alignItemsCenter]}>
                                                    <Text style={[styles.textLabelSupporting, styles.textLabelSupporting, styles.lh20, styles.mr1]}>{supportText}</Text>
                                                    <PressableWithFeedback
                                                        accessibilityRole="button"
                                                        accessible
                                                        accessibilityLabel="button"
                                                        style={[styles.reportPreviewArrowButton, {backgroundColor: theme.buttonDefaultBG}]}
                                                        onPress={() => handleChange(currentIndex - 1)}
                                                        disabled={currentIndex === 0}
                                                        disabledStyle={[styles.cursorDefault, styles.buttonOpacityDisabled]}
                                                    >
                                                        <Icon
                                                            src={Expensicons.BackArrow}
                                                            small
                                                            fill={theme.icon}
                                                            isButtonIcon
                                                        />
                                                    </PressableWithFeedback>
                                                    <PressableWithFeedback
                                                        accessibilityRole="button"
                                                        accessible
                                                        accessibilityLabel="button"
                                                        style={[styles.reportPreviewArrowButton, {backgroundColor: theme.buttonDefaultBG}]}
                                                        onPress={() => handleChange(currentIndex + 1)}
                                                        disabled={lastVisibleIndex === Math.min(transactions.length - 1, 10)}
                                                        disabledStyle={[styles.cursorDefault, styles.buttonOpacityDisabled]}
                                                    >
                                                        <Icon
                                                            src={Expensicons.ArrowRight}
                                                            small
                                                            fill={theme.icon}
                                                            isButtonIcon
                                                        />
                                                    </PressableWithFeedback>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <View style={[styles.flex1, styles.flexColumn, styles.overflowVisible, styles.mtn1]}>
                                        <FlatList
                                            snapToAlignment="start"
                                            decelerationRate="fast"
                                            snapToInterval={reportPreviewStyles.transactionPreviewStyle.width + styles.gap2.gap}
                                            horizontal
                                            data={transactions.slice(0, 11)}
                                            ref={carouselRef}
                                            nestedScrollEnabled
                                            bounces={false}
                                            keyExtractor={(item) => `${item.transactionID}_${reportPreviewStyles.transactionPreviewStyle.width}`}
                                            contentContainerStyle={[styles.gap2]}
                                            style={reportPreviewStyles.flatListStyle}
                                            showsHorizontalScrollIndicator={false}
                                            renderItem={renderFlatlistItem}
                                            onViewableItemsChanged={onViewableItemsChanged}
                                            viewabilityConfig={viewabilityConfig}
                                            ListFooterComponent={<View style={styles.pl2} />}
                                            ListHeaderComponent={<View style={styles.pr2} />}
                                        />
                                    </View>
                                    {shouldUseNarrowLayout && transactions.length > 1 && (
                                        <View style={[styles.flexRow, styles.alignSelfCenter, styles.gap2]}>
                                            {transactions.slice(0, 11).map((item, index) => (
                                                <PressableWithFeedback
                                                    accessibilityRole="button"
                                                    accessible
                                                    accessibilityLabel="button"
                                                    style={[styles.reportPreviewCarouselDots, {backgroundColor: index === currentIndex ? theme.icon : theme.buttonDefaultBG}]}
                                                    onPress={() => handleChange(index)}
                                                />
                                            ))}
                                        </View>
                                    )}
                                    {(buttonType === IOU_REPORT_PREVIEW_BUTTON.PAY || buttonType === IOU_REPORT_PREVIEW_BUTTON.APPROVE) && (
                                        <AnimatedSettlementButton
                                            onlyShowPayElsewhere={shouldShowOnlyPayElsewhere}
                                            isPaidAnimationRunning={isPaidAnimationRunning}
                                            isApprovedAnimationRunning={isApprovedAnimationRunning}
                                            canIOUBePaid={canIOUBePaidAndApproved || isPaidAnimationRunning}
                                            onAnimationFinish={stopAnimation}
                                            formattedAmount={getTotalAmountForIOUReportPreviewButton(iouReport, policy, buttonType)}
                                            currency={iouReport?.currency}
                                            policyID={policyID}
                                            chatReportID={chatReportID}
                                            iouReport={iouReport}
                                            wrapperStyle={buttonMaxWidth}
                                            onPress={confirmPayment}
                                            onPaymentOptionsShow={onPaymentOptionsShow}
                                            onPaymentOptionsHide={onPaymentOptionsHide}
                                            confirmApproval={confirmApproval}
                                            enablePaymentsRoute={ROUTES.ENABLE_PAYMENTS}
                                            addBankAccountRoute={bankAccountRoute}
                                            shouldHidePaymentOptions={buttonType !== IOU_REPORT_PREVIEW_BUTTON.PAY}
                                            shouldShowApproveButton={buttonType === IOU_REPORT_PREVIEW_BUTTON.APPROVE}
                                            shouldDisableApproveButton={shouldDisableApproveButton}
                                            kycWallAnchorAlignment={{
                                                horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.LEFT,
                                                vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.BOTTOM,
                                            }}
                                            paymentMethodDropdownAnchorAlignment={{
                                                horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
                                                vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.BOTTOM,
                                            }}
                                            isDisabled={isOffline && !canAllowSettlement}
                                            isLoading={!isOffline && !canAllowSettlement}
                                        />
                                    )}
                                    {buttonType === IOU_REPORT_PREVIEW_BUTTON.EXPORT && !!connectedIntegration && (
                                        <ExportWithDropdownMenu
                                            policy={policy}
                                            report={iouReport}
                                            connectionName={connectedIntegration}
                                            wrapperStyle={[buttonMaxWidth, styles.flexReset]}
                                            dropdownAnchorAlignment={{
                                                horizontal: CONST.MODAL.ANCHOR_ORIGIN_HORIZONTAL.RIGHT,
                                                vertical: CONST.MODAL.ANCHOR_ORIGIN_VERTICAL.BOTTOM,
                                            }}
                                        />
                                    )}
                                    {buttonType === IOU_REPORT_PREVIEW_BUTTON.REVIEW && (
                                        <Button
                                            icon={Expensicons.DotIndicator}
                                            iconFill={theme.danger}
                                            iconHoverFill={theme.danger}
                                            text={translate('common.review', {
                                                amount: shouldShowSettlementButton ? getTotalAmountForIOUReportPreviewButton(iouReport, policy, buttonType) : '',
                                            })}
                                            onPress={() => {}}
                                            style={buttonMaxWidth}
                                        />
                                    )}
                                    {buttonType === IOU_REPORT_PREVIEW_BUTTON.SUBMIT && (
                                        <Button
                                            success={isWaitingForSubmissionFromCurrentUser}
                                            text={translate('iou.submitAmount', {amount: getTotalAmountForIOUReportPreviewButton(iouReport, policy, buttonType)})}
                                            style={buttonMaxWidth}
                                            onPress={() => iouReport && submitReport(iouReport)}
                                            isDisabled={shouldDisableSubmitButton}
                                        />
                                    )}
                                </View>
                            </View>
                        </View>
                    </PressableWithoutFeedback>
                </View>
                <DelegateNoAccessModal
                    isNoDelegateAccessMenuVisible={isNoDelegateAccessMenuVisible}
                    onClose={() => setIsNoDelegateAccessMenuVisible(false)}
                />

                {isHoldMenuVisible && !!iouReport && !!requestType && (
                    <ProcessMoneyReportHoldMenu
                        nonHeldAmount={!hasOnlyHeldExpenses && hasValidNonHeldAmount ? nonHeldAmount : undefined}
                        requestType={requestType}
                        fullAmount={fullAmount}
                        onClose={() => setIsHoldMenuVisible(false)}
                        isVisible={isHoldMenuVisible}
                        paymentType={paymentType}
                        chatReport={chatReport}
                        moneyRequestReport={iouReport}
                        transactionCount={numberOfRequests}
                        startAnimation={() => {
                            if (requestType === CONST.IOU.REPORT_ACTION_TYPE.APPROVE) {
                                startApprovedAnimation();
                            } else {
                                startAnimation();
                            }
                        }}
                    />
                )}
            </OfflineWithFeedback>
        )
    );
}

MoneyRequestReportPreviewContent.displayName = 'MoneyRequestReportPreviewContent';

export default MoneyRequestReportPreviewContent;
