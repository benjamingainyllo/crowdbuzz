import { Planned } from "@/components/admin/planned";

export const metadata = {
  title: "CMS — owner",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <Planned
      title="CMS"
      sub="The words on the public site, without a deploy."
      will={[
        "The marketing pages, the help articles and the legal pages, editable here.",
        "Who changed what, and the ability to put it back.",
      ]}
      needs={[
        "Every public page is currently written in code, which means changing a sentence takes a deploy. Moving them here means a content store and a rendering path for it.",
      ]}
    />
  );
}
