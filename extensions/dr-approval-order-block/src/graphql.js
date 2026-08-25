async function graphqlRequest(query, variables) {
  const response = await fetch("shopify:admin/api/graphql.json", {
    method: "POST",
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`);
  }

  const body = await response.json();
  if (body.errors?.length) {
    throw new Error(body.errors.map((error) => error.message).join(" "));
  }

  return body.data;
}

// Reads custom.smile_photo (presence only, via references) and
// custom.dr_approval_decision in one round trip.
export async function fetchOrderApprovalState(orderId) {
  const data = await graphqlRequest(
    `#graphql
    query DrApprovalOrderState($id: ID!) {
      order(id: $id) {
        smilePhoto: metafield(namespace: "custom", key: "smile_photo") {
          references(first: 1) {
            edges {
              cursor
            }
          }
        }
        decision: metafield(namespace: "custom", key: "dr_approval_decision") {
          value
        }
      }
    }`,
    { id: orderId }
  );

  const photoEdges = data?.order?.smilePhoto?.references?.edges ?? [];
  return {
    hasSmilePhoto: photoEdges.length > 0,
    decision: data?.order?.decision?.value ?? null,
  };
}

export async function fetchCurrentStaffMemberName() {
  const data = await graphqlRequest(
    `#graphql
    query CurrentStaffMember {
      currentStaffMember {
        firstName
        lastName
      }
    }`
  );

  const staff = data?.currentStaffMember;
  const name = [staff?.firstName, staff?.lastName].filter(Boolean).join(" ");
  return name || "Unknown staff member";
}

export async function setApprovalDecision(orderId, sentence) {
  const data = await graphqlRequest(
    `#graphql
    mutation SetDrApprovalDecision($metafields: [MetafieldsSetInput!]!) {
      metafieldsSet(metafields: $metafields) {
        userErrors {
          message
        }
      }
    }`,
    {
      metafields: [
        {
          ownerId: orderId,
          namespace: "custom",
          key: "dr_approval_decision",
          type: "single_line_text_field",
          value: sentence,
        },
      ],
    }
  );

  const userErrors = data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length > 0) {
    throw new Error(userErrors.map((error) => error.message).join(" "));
  }
}
