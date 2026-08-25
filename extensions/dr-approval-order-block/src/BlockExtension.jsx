import { render } from "preact";
import { useCallback, useEffect, useState } from "preact/hooks";
import {
  fetchOrderApprovalState,
  fetchCurrentStaffMemberName,
  setApprovalDecision,
} from "./graphql";
import { resolveDecisionTone, buildDecisionSentence } from "./decision";

export default async () => {
  render(<Extension />, document.body);

  function Extension() {
    const { data, i18n } = shopify;
    const orderId = data.selected[0].id;

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [hasSmilePhoto, setHasSmilePhoto] = useState(false);
    const [decision, setDecision] = useState(/** @type {string | null} */ (null));
    const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */ (null));

    useEffect(() => {
      let cancelled = false;

      (async function loadApprovalState() {
        setLoading(true);
        setErrorMessage(null);
        try {
          const state = await fetchOrderApprovalState(orderId);
          if (cancelled) return;
          setHasSmilePhoto(state.hasSmilePhoto);
          setDecision(state.decision);
        } catch (error) {
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
      async (actionKey) => {
        setSubmitting(true);
        setErrorMessage(null);
        try {
          const staffName = await fetchCurrentStaffMemberName();
          const sentence = buildDecisionSentence(actionKey, staffName, new Date());
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

    if (loading) {
      return (
        <s-admin-block heading={i18n.translate("name")}>
          <s-spinner accessibilityLabel={i18n.translate("loading")} />
        </s-admin-block>
      );
    }

    if (!hasSmilePhoto) {
      return null;
    }

    return (
      <s-admin-block heading={i18n.translate("name")}>
        <s-stack direction="block" gap="base">
          {errorMessage ? <s-banner tone="critical">{errorMessage}</s-banner> : null}
          {decision ? (
            <s-banner tone={resolveDecisionTone(decision)}>{decision}</s-banner>
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
                onClick={() => recordDecision("Rejected")}
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
