import { getYear } from "date-fns";
import iconUrl from "../../assets/icons/icon128.png";
import { Badge } from "../ui/shadcn/badge.tsx";
import { Button } from "../ui/shadcn/button.tsx";
import { Card, CardContent } from "../ui/shadcn/card.tsx";
import { Separator } from "../ui/shadcn/separator.tsx";
import { GitHubIcon } from "./icons.tsx";

const year = getYear(Date.now());

const contacts = [
  ["Google Forms로 제보하기", "https://forms.gle/i81z4jLKyXF1oXKBA"],
  ["GitHub Issue 생성하기", "https://github.com/enc2586/csmsplus/issues"],
  ["이메일 문의: enc25867@gm.gist.ac.kr", "mailto:enc25867@gm.gist.ac.kr"],
] as const;

export function AboutTab() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 text-center">
        <img src={iconUrl} alt="CSMS+ Logo" className="h-20 w-20" />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-semibold">CSMS+</h2>
          <Badge variant="secondary" className="font-mono">
            v{chrome.runtime.getManifest().version}
          </Badge>
        </div>
        <p className="text-muted-foreground">GIST LMS를 더 편리하게 만들어드립니다.</p>
        <Button variant="outline" asChild>
          <a href="https://github.com/enc2586/csmsplus" target="_blank">
            <GitHubIcon />
            GitHub 저장소
          </a>
        </Button>

        <Separator className="my-2" />

        <div className="flex w-full flex-col gap-2 text-left">
          <h3 className="font-semibold">버그 제보 및 기능 제안</h3>
          <p className="text-sm text-muted-foreground">
            문제가 발생했거나 새로운 기능이 필요하다면 언제든 알려주세요!
          </p>
          <ul className="flex flex-col gap-1 text-sm">
            {contacts.map(([label, href]) => (
              <li key={href}>
                <a href={href} target="_blank" className="text-brand hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <Separator className="my-2" />

        <div className="text-sm text-muted-foreground">
          <h3 className="mb-1 font-semibold text-foreground">License</h3>
          <p>
            Licensed under{" "}
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              className="underline"
            >
              CC BY-NC-SA 4.0
            </a>
          </p>
          <p>Copyright © {year} 최홍제</p>
        </div>
      </CardContent>
    </Card>
  );
}
