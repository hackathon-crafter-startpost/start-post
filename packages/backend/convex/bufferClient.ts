export const BUFFER_GRAPHQL_ENDPOINT = "https://api.buffer.com";

export interface BufferGraphQLResponse<T = any> {
  data?: T;
  errors?: Array<{ message: string; locations?: any[]; path?: string[] }>;
}

export interface BufferAccountData {
  account: {
    id: string;
    email?: string;
    organizations: Array<{
      id: string;
      name: string;
    }>;
  };
}

export interface BufferChannelData {
  id: string;
  name: string;
  service: string;
  avatar?: string;
}

export interface BufferChannelsResponseData {
  channels: BufferChannelData[];
}

export interface BufferCreatePostPayload {
  channelId: string;
  text: string;
  schedulingType?: "automatic" | "manual";
  mode?: "addToQueue" | "now" | "next" | "customScheduled";
  dueAt?: string;
  imageUrl?: string;
}

export interface BufferCreateIdeaPayload {
  organizationId: string;
  title: string;
  text: string;
}

export interface BufferPostResult {
  id: string;
  text?: string;
  dueAt?: string;
  status?: string;
}

export interface BufferIdeaResult {
  id: string;
  content: {
    title: string;
    text: string;
  };
}

/**
 * Execute a GraphQL query or mutation against Buffer's API
 */
export async function executeBufferGraphQL<T = any>(
  apiKey: string,
  query: string,
  variables: Record<string, any> = {},
  endpoint: string = BUFFER_GRAPHQL_ENDPOINT,
  fetchFn: typeof fetch = fetch
): Promise<T> {
  if (!apiKey || apiKey.trim() === "") {
    throw new Error("Buffer API key is required");
  }

  const response = await fetchFn(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey.trim()}`,
      Accept: "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Buffer API HTTP error ${response.status} (${response.statusText}): ${errorText || "Unknown error"}`
    );
  }

  const result: BufferGraphQLResponse<T> = await response.json();

  if (result.errors && result.errors.length > 0) {
    const errorMessages = result.errors.map((e) => e.message).join(", ");
    throw new Error(`Buffer GraphQL Error: ${errorMessages}`);
  }

  if (!result.data) {
    throw new Error("Buffer API returned no data in response");
  }

  return result.data;
}

/**
 * Fetch Account information and accessible Organizations
 */
export async function fetchBufferAccountAndOrgs(
  apiKey: string,
  endpoint?: string,
  fetchFn?: typeof fetch
) {
  const query = `
    query GetAccountAndOrganizations {
      account {
        id
        email
        organizations {
          id
          name
        }
      }
    }
  `;

  const data = await executeBufferGraphQL<BufferAccountData>(
    apiKey,
    query,
    {},
    endpoint,
    fetchFn
  );

  return {
    accountId: data.account?.id,
    email: data.account?.email,
    organizations: data.account?.organizations || [],
  };
}

/**
 * Fetch social media Channels for a given Organization
 */
export async function fetchBufferChannels(
  apiKey: string,
  organizationId: string,
  endpoint?: string,
  fetchFn?: typeof fetch
): Promise<BufferChannelData[]> {
  const query = `
    query GetChannels($input: ChannelsInput!) {
      channels(input: $input) {
        id
        name
        service
        avatar
      }
    }
  `;

  const data = await executeBufferGraphQL<BufferChannelsResponseData>(
    apiKey,
    query,
    { input: { organizationId } },
    endpoint,
    fetchFn
  );

  return data.channels || [];
}

/**
 * Create a new Post in Buffer (schedule, add to queue, or publish immediately)
 */
export async function createBufferPost(
  apiKey: string,
  payload: BufferCreatePostPayload,
  endpoint?: string,
  fetchFn?: typeof fetch
): Promise<{ success: boolean; post?: BufferPostResult; error?: string }> {
  const mutation = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
            text
            dueAt
            status
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const input: Record<string, any> = {
    channelId: payload.channelId,
    text: payload.text,
    schedulingType: payload.schedulingType || "automatic",
    mode: payload.mode || "addToQueue",
  };

  if (payload.dueAt) {
    input.dueAt = payload.dueAt;
  }

  if (payload.imageUrl) {
    input.assets = [
      {
        image: {
          url: payload.imageUrl,
        },
      },
    ];
  }

  try {
    const data = await executeBufferGraphQL<{
      createPost:
        | { post: BufferPostResult }
        | { message: string }
        | null;
    }>(apiKey, mutation, { input }, endpoint, fetchFn);

    if (!data.createPost) {
      return { success: false, error: "Empty createPost response from Buffer" };
    }

    if ("message" in data.createPost && data.createPost.message) {
      return { success: false, error: data.createPost.message };
    }

    if ("post" in data.createPost && data.createPost.post) {
      return { success: true, post: data.createPost.post };
    }

    return { success: false, error: "Unknown createPost response shape" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create Buffer post" };
  }
}

/**
 * Create an Idea (backlog draft) in Buffer for a given Organization
 */
export async function createBufferIdea(
  apiKey: string,
  payload: BufferCreateIdeaPayload,
  endpoint?: string,
  fetchFn?: typeof fetch
): Promise<{ success: boolean; idea?: BufferIdeaResult; error?: string }> {
  const mutation = `
    mutation CreateIdea($input: CreateIdeaInput!) {
      createIdea(input: $input) {
        ... on Idea {
          id
          content {
            title
            text
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  const input = {
    organizationId: payload.organizationId,
    content: {
      title: payload.title,
      text: payload.text,
    },
  };

  try {
    const data = await executeBufferGraphQL<{
      createIdea:
        | BufferIdeaResult
        | { message: string }
        | null;
    }>(apiKey, mutation, { input }, endpoint, fetchFn);

    if (!data.createIdea) {
      return { success: false, error: "Empty createIdea response from Buffer" };
    }

    if ("message" in data.createIdea && data.createIdea.message) {
      return { success: false, error: data.createIdea.message };
    }

    if ("id" in data.createIdea && data.createIdea.id) {
      return { success: true, idea: data.createIdea as BufferIdeaResult };
    }

    return { success: false, error: "Unknown createIdea response shape" };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create Buffer idea" };
  }
}

/**
 * Delete a Post in Buffer
 */
export async function deleteBufferPost(
  apiKey: string,
  postId: string,
  endpoint?: string,
  fetchFn?: typeof fetch
): Promise<{ success: boolean; error?: string }> {
  const mutation = `
    mutation DeletePost($input: DeletePostInput!) {
      deletePost(input: $input) {
        ... on PostActionSuccess {
          post {
            id
          }
        }
        ... on MutationError {
          message
        }
      }
    }
  `;

  try {
    const data = await executeBufferGraphQL<{
      deletePost:
        | { post: { id: string } }
        | { message: string }
        | null;
    }>(apiKey, mutation, { input: { id: postId } }, endpoint, fetchFn);

    if (data.deletePost && "message" in data.deletePost) {
      return { success: false, error: data.deletePost.message };
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to delete Buffer post" };
  }
}
