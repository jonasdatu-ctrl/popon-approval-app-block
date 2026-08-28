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

// Reads custom.dr_approval_decision (order-level) and the linked customer's
// custom.smile_photos (customer-level image list) in one round trip. Block
// visibility and the photo preview are both driven by the customer's
// smile_photos - there is no separate order-level gating field.
export async function fetchOrderApprovalState(orderId) {
  const data = await graphqlRequest(
    `#graphql
    query DrApprovalOrderState($id: ID!) {
      order(id: $id) {
        decision: metafield(namespace: "custom", key: "dr_approval_decision") {
          value
        }
        customer {
          smilePhotos: metafield(namespace: "custom", key: "smile_photos") {
            references(first: 10) {
              edges {
                node {
                  ... on MediaImage {
                    image {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
    }`,
    { id: orderId }
  );

  const customerPhotoEdges =
    data?.order?.customer?.smilePhotos?.references?.edges ?? [];
  const customerSmilePhotos = customerPhotoEdges
    .map((edge) => edge?.node?.image)
    .filter(Boolean)
    .map((image) => ({ url: image.url, alt: image.altText ?? null }));

  return {
    decision: data?.order?.decision?.value ?? null,
    customerSmilePhotos,
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
