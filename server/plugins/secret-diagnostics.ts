import { warnAboutPlaintextStoredSecrets } from "../utils/secret-diagnostics";
import { useDb } from "../utils/db";
import { logger } from "../utils/logger";

export default defineNitroPlugin(() => {
  try {
    warnAboutPlaintextStoredSecrets(useDb()).catch((error: any) => {
      logger.warn("Stored secret diagnostics failed", { error });
    });
  } catch (error: any) {
    logger.warn("Stored secret diagnostics failed", { error });
  }
});
