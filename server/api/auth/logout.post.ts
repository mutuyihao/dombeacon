import { ADMIN_SESSION_COOKIE } from "../../utils/auth";

export default defineEventHandler(async (event) => {
  deleteCookie(event, ADMIN_SESSION_COOKIE, { path: "/" });
  return success({ loggedOut: true });
});
