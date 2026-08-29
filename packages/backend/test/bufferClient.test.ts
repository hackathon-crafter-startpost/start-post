import { describe, it, expect, vi } from "vitest";
import {
  fetchBufferAccountAndOrgs,
  fetchBufferChannels,
  createBufferPost,
  createBufferIdea,
  deleteBufferPost,
  executeBufferGraphQL,
} from "../convex/lib/bufferClient";


describe("Buffer GraphQL Client", () => {
  const mockApiKey = "buf_test_api_key_12345";

  describe("executeBufferGraphQL", () => {
    it("should throw an error when API key is missing or empty", async () => {
      await expect(executeBufferGraphQL("", "query { account { id } }")).rejects.toThrow(
        "Buffer API key is required"
      );
      await expect(executeBufferGraphQL("   ", "query { account { id } }")).rejects.toThrow(
        "Buffer API key is required"
      );
    });

    it("should send Authorization Bearer header and query correctly", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: { account: { id: "acc_1", organizations: [] } },
        }),
      });

      const res = await executeBufferGraphQL(
        mockApiKey,
        "query GetAcc { account { id } }",
        {},
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.buffer.com",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            Authorization: `Bearer ${mockApiKey}`,
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            query: "query GetAcc { account { id } }",
            variables: {},
          }),
        })
      );
      expect(res).toEqual({ account: { id: "acc_1", organizations: [] } });
    });

    it("should throw if response is not ok", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "Invalid token",
      });

      await expect(
        executeBufferGraphQL(
          mockApiKey,
          "query { account { id } }",
          {},
          "https://api.buffer.com",
          mockFetch as any
        )
      ).rejects.toThrow("Buffer API HTTP error 401 (Unauthorized)");
    });

    it("should throw if GraphQL errors array is present", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          errors: [{ message: "Channel not found" }],
        }),
      });

      await expect(
        executeBufferGraphQL(
          mockApiKey,
          "query { channels { id } }",
          {},
          "https://api.buffer.com",
          mockFetch as any
        )
      ).rejects.toThrow("Buffer GraphQL Error: Channel not found");
    });
  });

  describe("fetchBufferAccountAndOrgs", () => {
    it("should return accountId, email, and organizations", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            account: {
              id: "acc_999",
              email: "dev@buildsignal.io",
              organizations: [
                { id: "org_1", name: "Engineering Org" },
                { id: "org_2", name: "Personal" },
              ],
            },
          },
        }),
      });

      const result = await fetchBufferAccountAndOrgs(
        mockApiKey,
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(result.accountId).toBe("acc_999");
      expect(result.email).toBe("dev@buildsignal.io");
      expect(result.organizations).toHaveLength(2);
      expect(result.organizations[0].name).toBe("Engineering Org");
    });
  });

  describe("fetchBufferChannels", () => {
    it("should return channels for an organization", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            channels: [
              {
                id: "chan_linkedin_1",
                name: "Diego Tech",
                service: "linkedin",
                avatar: "https://avatar.com/linkedin.png",
              },
              {
                id: "chan_twitter_2",
                name: "@diego_codes",
                service: "twitter",
              },
            ],
          },
        }),
      });

      const channels = await fetchBufferChannels(
        mockApiKey,
        "org_1",
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(channels).toHaveLength(2);
      expect(channels[0].service).toBe("linkedin");
      expect(channels[1].service).toBe("twitter");
    });
  });

  describe("createBufferPost", () => {
    it("should successfully create a post and return post info", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            createPost: {
              post: {
                id: "post_123",
                text: "¿Sabías esto de los Web Audio API? 💡",
                dueAt: "2026-08-30T10:00:00.000Z",
                status: "buffer_queued",
              },
            },
          },
        }),
      });

      const res = await createBufferPost(
        mockApiKey,
        {
          channelId: "chan_linkedin_1",
          text: "¿Sabías esto de los Web Audio API? 💡",
          mode: "addToQueue",
          schedulingType: "automatic",
          imageUrl: "https://buildsignal.io/assets/card-123.png",
        },
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(res.success).toBe(true);
      expect(res.post?.id).toBe("post_123");
      expect(res.post?.status).toBe("buffer_queued");

      const calledBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(calledBody.variables.input.assets).toEqual([
        { image: { url: "https://buildsignal.io/assets/card-123.png" } },
      ]);
      expect(calledBody.variables.input.mode).toBe("addToQueue");
    });

    it("should handle Buffer MutationError gracefully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            createPost: {
              message: "Rate limit reached for LinkedIn publishing",
            },
          },
        }),
      });

      const res = await createBufferPost(
        mockApiKey,
        {
          channelId: "chan_linkedin_1",
          text: "Test post",
        },
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(res.success).toBe(false);
      expect(res.error).toBe("Rate limit reached for LinkedIn publishing");
    });
  });

  describe("createBufferIdea", () => {
    it("should successfully create an Idea in Buffer", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            createIdea: {
              id: "idea_789",
              content: {
                title: "Bug fix AudioNode",
                text: "Detalle técnico de la solución",
              },
            },
          },
        }),
      });

      const res = await createBufferIdea(
        mockApiKey,
        {
          organizationId: "org_1",
          title: "Bug fix AudioNode",
          text: "Detalle técnico de la solución",
        },
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(res.success).toBe(true);
      expect(res.idea?.id).toBe("idea_789");
      expect(res.idea?.content.title).toBe("Bug fix AudioNode");
    });
  });

  describe("deleteBufferPost", () => {
    it("should delete post successfully", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            deletePost: {
              post: { id: "post_123" },
            },
          },
        }),
      });

      const res = await deleteBufferPost(
        mockApiKey,
        "post_123",
        "https://api.buffer.com",
        mockFetch as any
      );

      expect(res.success).toBe(true);
    });
  });
});
