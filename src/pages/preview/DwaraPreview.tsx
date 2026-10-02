import { useRef } from "react";
import { useSearchParams } from "react-router-dom";
import DwaraFlow from "@/components/onboarding/dwara/DwaraFlow";

/**
 * Dev-only harness for the onboarding portal (registered only when
 * import.meta.env.DEV). The real page sits behind Google sign-in, so this is
 * how the flow gets exercised without a session. Nothing is written.
 *
 *   ?lang=chosen   skip the language step
 *   ?fail=1        make the first save fail, to see the retry card
 */
export default function DwaraPreview() {
  const [params] = useSearchParams();
  const failedOnce = useRef(false);

  return (
    <DwaraFlow
      initialName={params.get("name") ?? "Ayush"}
      languageChosen={params.get("lang") === "chosen"}
      onSave={async (result) => {
        console.info("[dwara preview] would save:", result);
        await new Promise((r) => setTimeout(r, 900));
        if (params.get("fail") === "1" && !failedOnce.current) {
          failedOnce.current = true;
          throw new Error("simulated failure");
        }
      }}
      onDone={() => console.info("[dwara preview] stepped through")}
    />
  );
}
