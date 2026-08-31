import { test } from "node:test";
import assert from "node:assert/strict";
import { cookieDomainAttr, parseCookie } from "./cross-domain-store.js";

test("cookieDomainAttr scopes to the registrable parent domain", () => {
  assert.equal(
    cookieDomainAttr("www.setgostrength.com"),
    "; Domain=.setgostrength.com"
  );
  assert.equal(
    cookieDomainAttr("equestrian.setgostrength.com"),
    "; Domain=.setgostrength.com"
  );
  assert.equal(
    cookieDomainAttr("setgostrength.com"),
    "; Domain=.setgostrength.com"
  );
});

test("cookieDomainAttr returns empty (host-only) for local/dev hosts", () => {
  assert.equal(cookieDomainAttr("localhost"), "");
  assert.equal(cookieDomainAttr("equestrian.localhost"), "");
  assert.equal(cookieDomainAttr("127.0.0.1"), "");
  assert.equal(cookieDomainAttr(""), "");
});

test("parseCookie extracts a value by name", () => {
  assert.equal(
    parseCookie("a=1; setgo.accessCode=abc; b=2", "setgo.accessCode"),
    "abc"
  );
  assert.equal(
    parseCookie("setgo.termsAcceptedVersion=1", "setgo.termsAcceptedVersion"),
    "1"
  );
});

test("parseCookie decodes URL-encoded values and trims spaces", () => {
  assert.equal(parseCookie("x=hello%20world", "x"), "hello world");
  assert.equal(parseCookie(" a=1 ;  b=2 ", "b"), "2");
});

test("parseCookie returns null when absent or empty", () => {
  assert.equal(parseCookie("a=1; b=2", "missing"), null);
  assert.equal(parseCookie("", "a"), null);
  assert.equal(parseCookie(null, "a"), null);
});
