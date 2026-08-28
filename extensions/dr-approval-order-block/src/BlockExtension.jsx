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
    const [decision, setDecision] = useState(/** @type {string | null} */ (null));
    const [customerSmilePhotos, setCustomerSmilePhotos] = useState(/** @type {{url: string, alt: string | null}[]} */ ([]));
    const [errorMessage, setErrorMessage] = useState(/** @type {string | null} */ (null));

    useEffect(() => {
      let cancelled = false;

      (async function loadApprovalState() {
        setLoading(true);
        setErrorMessage(null);
        try {
          const state = await fetchOrderApprovalState(orderId);
          if (cancelled) return;
          setDecision(state.decision);
          setCustomerSmilePhotos(state.customerSmilePhotos);
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
          console.error("[dr-approval-order-block] recordDecision failed:", error);
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

    const hasPhotos = customerSmilePhotos.length > 0;

    return (
      <s-admin-block heading={i18n.translate("name")}>
        <s-stack direction="block" gap="base">
          {errorMessage ? <s-banner tone="critical">{errorMessage}</s-banner> : null}

          <s-stack direction="block" gap="small">
            <s-heading>{i18n.translate("smile-photos-heading")}</s-heading>
            {hasPhotos ? (
              <s-stack direction="inline" gap="base">
                {customerSmilePhotos.map((photo) => (
                  <s-thumbnail
                    key={photo.url}
                    src={photo.url}
                    alt={photo.alt ?? i18n.translate("smile-photo-alt")}
                    size="large"
                  />
                ))}
              </s-stack>
            ) : (
              <s-banner tone="info">{i18n.translate("smile-photos-empty")}</s-banner>
            )}
          </s-stack>

          {hasPhotos ? (
            <s-stack direction="block" gap="small">
              <s-heading>{i18n.translate("decision-heading")}</s-heading>
              {decision ? (
                <s-banner tone={resolveDecisionTone(decision)}>{decision}</s-banner>
              ) : (
                <s-stack direction="block" gap="base">
                  <s-paragraph>{i18n.translate("decision-prompt")}</s-paragraph>
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
                </s-stack>
              )}
            </s-stack>
          ) : null}
        </s-stack>
      </s-admin-block>
    );
  }
};
