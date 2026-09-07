import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  fetchOrderApprovalState,
  fetchCurrentStaffMemberName,
  setApprovalDecision,
} from "./graphql";
import { resolveDecisionTone, buildDecisionSentence, appendReason } from "./decision";

export default async () => {
  render(<Extension />, document.body);

  function Extension() {
    const { data, i18n } = shopify;
    const orderId = data.selected?.[0]?.id ?? null;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasSmilePhoto, setHasSmilePhoto] = useState(false);
    const [decision, setDecision] = useState(/** @type {string | null} */ (null));
    const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */ (null));
    const [step, setStep] = useState(/** @type {"buttons" | "reject-reason"} */ ("buttons"));
    const [rejectReason, setRejectReason] = useState("");

    useEffect(() => {
      let cancelled = false;

      if (!orderId) {
        console.error(
          "[dr-approval-order-block] no order id available from shopify.data.selected:",
          data.selected
        );
        setErrorMessage(i18n.translate("error-loading"));
        setLoading(false);
        return;
      }

      (async function loadApprovalState() {
        setLoading(true);
        setErrorMessage(null);
        try {
          const state = await fetchOrderApprovalState(orderId);
          if (cancelled) return;
          setHasSmilePhoto(state.hasSmilePhoto);
          setDecision(state.decision);
        } catch (error) {
          console.error("[dr-approval-order-block] loadApprovalState failed:", error);
          if (!cancelled) setErrorMessage(i18n.translate("error-loading"));
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();

      return () => {
        cancelled = true;
      };
    }, [orderId]);

    const recordDecision = useCallback(
      async (actionKey, reason) => {
        setSubmitting(true);
        setErrorMessage(null);
        try {
          const staffName = await fetchCurrentStaffMemberName();
          const baseSentence = buildDecisionSentence(actionKey, staffName, new Date());
          const sentence =
            actionKey === "Rejected" ? appendReason(baseSentence, reason) : baseSentence;
          await setApprovalDecision(orderId, sentence);
          setDecision(sentence);
        } catch (error) {
          setErrorMessage(i18n.translate("error-submitting"));
        } finally {
          setSubmitting(false);
        }
      },
      [orderId]
    );

    const handleBack = useCallback(() => {
      setRejectReason("");
      setStep("buttons");
    }, []);

    if (loading) {
      return (
        <s-admin-block heading={i18n.translate("name")}>
          <s-spinner accessibilityLabel={i18n.translate("loading")} />
        </s-admin-block>
      );
    }

    if (errorMessage) {
      return (
        <s-admin-block heading={i18n.translate("name")}>
          <s-banner tone="critical">{errorMessage}</s-banner>
        </s-admin-block>
      );
    }

    if (!hasSmilePhoto) {
      return (
        <s-admin-block heading={i18n.translate("name")}>
          <s-banner tone="info">{i18n.translate("no-smile-photo-banner")}</s-banner>
        </s-admin-block>
      );
    }

    return (
      <s-admin-block heading={i18n.translate("name")}>
        <s-stack direction="block" gap="base">
          {decision ? (
            <s-banner tone={resolveDecisionTone(decision)}>{decision}</s-banner>
          ) : step === "reject-reason" ? (
            <s-stack direction="block" gap="base">
              <s-text-field
                label={i18n.translate("reject-reason-label")}
                value={rejectReason}
                disabled={submitting}
                onInput={(event) => setRejectReason(event.currentTarget.value)}
              />
              <s-stack direction="inline" gap="base">
                <s-button disabled={submitting} onClick={handleBack}>
                  {i18n.translate("back-button")}
                </s-button>
                <s-button
                  tone="critical"
                  disabled={submitting || rejectReason.trim().length === 0}
                  onClick={() => recordDecision("Rejected", rejectReason.trim())}
                >
                  {i18n.translate("reject-confirm-button")}
                </s-button>
              </s-stack>
            </s-stack>
          ) : (
            <s-stack direction="inline" gap="base">
              <s-button
                tone="success"
                disabled={submitting}
                onClick={() => recordDecision("Approved")}
              >
                {i18n.translate("approve-button")}
              </s-button>
              <s-button
                tone="critical"
                disabled={submitting}
                onClick={() => setStep("reject-reason")}
              >
                {i18n.translate("reject-button")}
              </s-button>
            </s-stack>
          )}
        </s-stack>
      </s-admin-block>
    );
  }
};
