import { getYear } from "date-fns";
import iconUrl from "../../assets/icons/icon128.png";
import { cn } from "../ui/cn.ts";
import { GitHubIcon } from "./icons.tsx";

const link = cn("text-[LinkText] underline");
const year = getYear(Date.now());

export function AboutTab() {
  return (
    <div className="mx-auto max-w-150 rounded-[12px] bg-dark-card p-10 text-center">
      <div>
        <img src={iconUrl} alt="CSMS+ Logo" className="mb-5 inline h-20 w-20 align-baseline" />
        <h2 className="mb-2 pb-2.5 text-[24px] font-semibold">CSMS+</h2>
        <p className="mb-5 inline-block rounded-[4px] bg-white/5 px-2 py-1 font-mono text-[14px] text-gray-aaa">
          v<span>{chrome.runtime.getManifest().version}</span>
        </p>
      </div>
      <p className="mb-7.5 text-[16px] leading-[1.6] text-gray-e0e0e0">
        GIST LMS를 더 편리하게 만들어드립니다.
      </p>

      <div>
        <a
          href="https://github.com/enc2586/csmsplus"
          target="_blank"
          className="inline-flex items-center rounded-[6px] bg-dark-input px-5 py-2.5 text-gray-e0e0e0 transition-colors duration-200 hover:bg-gray-444"
        >
          <GitHubIcon />
          GitHub 저장소
        </a>
      </div>

      <div className="mt-8 w-full rounded-[12px] border border-gray-333 bg-white/3 p-6 text-left">
        <h3 className="mb-3 text-[1.1rem] font-bold text-gray-e0e0e0">버그 제보 및 기능 제안</h3>
        <p className="mb-4 text-[0.95rem] text-gray-aaa">
          문제가 발생했거나 새로운 기능이 필요하다면 언제든 알려주세요!
        </p>
        <ul className="[&_a]:text-brand [&_a:hover]:underline [&_li]:mb-2">
          <li>
            <a href="https://forms.gle/i81z4jLKyXF1oXKBA" target="_blank">
              Google Forms로 제보하기
            </a>
          </li>
          <li>
            <a href="https://github.com/enc2586/csmsplus/issues" target="_blank">
              GitHub Issue 생성하기
            </a>
          </li>
          <li>
            이메일 문의: <a href="mailto:enc25867@gm.gist.ac.kr">enc25867@gm.gist.ac.kr</a>
          </li>
        </ul>
      </div>

      <div className="mt-10 border-t border-gray-333 pt-5 text-[13px] text-gray-aaa">
        <h3 className="mb-2 text-[14px] font-bold text-gray-e0e0e0">License</h3>
        <p>
          Licensed under{" "}
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            className={link}
          >
            CC BY-NC-SA 4.0
          </a>
        </p>
        <p>Copyright © {year} 최홍제</p>
      </div>
    </div>
  );
}
