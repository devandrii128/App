import Onyx from 'react-native-onyx';
import ONYXKEYS from '@src/ONYXKEYS';
import type ModalType from '@src/types/utils/ModalType';

const closeModals: Array<(isNavigating?: boolean) => void> = [];

let onModalClose: null | (() => void);
let isNavigate: undefined | boolean;
let shouldCloseAll: boolean | undefined;

/**
 * Allows other parts of the app to call modal close function
 */
function setCloseModal(onClose: () => void) {
    if (!closeModals.includes(onClose)) {
        closeModals.push(onClose);
    }
    return () => {
        const index = closeModals.indexOf(onClose);
        if (index === -1) {
            return;
        }
        closeModals.splice(index, 1);
    };
}

/**
 * Close topmost modal
 */
function closeTop() {
    if (closeModals.length === 0) {
        return;
    }
    if (onModalClose) {
        closeModals[closeModals.length - 1](isNavigate);
        closeModals.pop();
        return;
    }
    closeModals[closeModals.length - 1]();
    closeModals.pop();
}

/**
 * Close modal in other parts of the app
 */
function close(onModalCloseCallback: () => void, isNavigating = true, shouldCloseAllModals = false) {
    if (closeModals.length === 0) {
        onModalCloseCallback();
        return;
    }
    onModalClose = onModalCloseCallback;
    shouldCloseAll = shouldCloseAllModals;
    isNavigate = isNavigating;
    closeTop();
}

function onModalDidClose() {
    if (!onModalClose) {
        return;
    }
    if (closeModals.length && shouldCloseAll) {
        closeTop();
        return;
    }
    onModalClose();
    onModalClose = null;
    isNavigate = undefined;
}

/**
 * Allows other parts of the app to know when a modal has been opened or closed
 */
function setModalVisibility(isVisible: boolean, type: ModalType | null = null) {
    Onyx.merge(ONYXKEYS.MODAL, {isVisible, type});
}

/**
 * Allows other parts of the app to set whether modals should be dismissable using the Escape key
 */
function setDisableDismissOnEscape(disableDismissOnEscape: boolean) {
    Onyx.merge(ONYXKEYS.MODAL, {disableDismissOnEscape});
}

/**
 * Allows other parts of app to know that an alert modal is about to open.
 * This will trigger as soon as a modal is opened but not yet visible while animation is running.
 * isPopover indicates that the next open modal is popover or bottom docked
 */
function willAlertModalBecomeVisible(isVisible: boolean, isPopover = false) {
    // We cancel the pending and active tooltips here instead of in setModalVisibility because
    // we want to do it when a modal is going to show. If we do it when the modal is fully shown,
    // the tooltip in that modal won't show.
    Onyx.merge(ONYXKEYS.MODAL, {willAlertModalBecomeVisible: isVisible, isPopover});
}

function areAllModalsHidden() {
    return closeModals.length === 0;
}

export {setCloseModal, close, onModalDidClose, setModalVisibility, willAlertModalBecomeVisible, setDisableDismissOnEscape, closeTop, areAllModalsHidden};
