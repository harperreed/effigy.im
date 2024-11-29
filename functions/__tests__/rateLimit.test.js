const request = require("supertest");
const functions = require("../index");
const express = require("express");

const app = express();
app.use("/a", functions.avatar);

describe("Rate Limiting Middleware", () => {
  test("should allow requests under the rate limit", async () => {
    for (let i = 0; i < 100; i++) {
      const response = await request(app).get("/a/testaddress.svg");
      expect(response.status).not.toBe(429);
    }
  });

  test("should block requests exceeding the rate limit", async () => {
    for (let i = 0; i < 100; i++) {
      await request(app).get("/a/testaddress.svg");
    }
    const response = await request(app).get("/a/testaddress.svg");
    expect(response.status).toBe(429);
    expect(response.body.error).toBe("Too many requests");
  });

  test("should include rate limiting headers in responses", async () => {
    const response = await request(app).get("/a/testaddress.svg");
    expect(response.headers).toHaveProperty("x-ratelimit-limit");
    expect(response.headers).toHaveProperty("x-ratelimit-remaining");
    expect(response.headers).toHaveProperty("x-ratelimit-reset");
  });
});
