import iconUrl from "../../assets/icons/icon128.png";
import { GitHubIcon } from "./icons.tsx";

const link = "text-[color:LinkText] underline";

export function AboutTab() {
  return (
    <div className="mx-auto max-w-600 rounded-12 bg-dark-card p-40 text-center">
      <div>
        <img src={iconUrl} alt="CSMS+ Logo" className="mb-20 inline h-80 w-80 align-baseline" />
        <h2 className="mb-8 pb-10 text-24 font-semibold">CSMS+</h2>
        <p className="mb-20 inline-block rounded-4 bg-white/5 px-8 py-4 font-mono text-14 text-gray-aaa">
          v<span>{chrome.runtime.getManifest().version}</span>
        </p>
      </div>
      <p className="mb-30 text-16 leading-[1.6] text-gray-e0e0e0">
        GIST LMS를 더 편리하게 만들어드립니다.
      </p>

      <div>
        <a
          href="https://github.com/enc2586/csmsplus"
          target="_blank"
          className="inline-flex items-center rounded-6 bg-dark-input px-20 py-10 text-gray-e0e0e0 transition-colors duration-200 hover:bg-gray-444"
        >
          <GitHubIcon />
          GitHub 저장소
        </a>
      </div>

      <div className="mt-32 w-full rounded-12 border border-gray-333 bg-white/[0.03] p-24 text-left">
        <h3 className="mb-12 text-[1.1rem] font-bold text-gray-e0e0e0">버그 제보 및 기능 제안</h3>
        <p className="mb-16 text-[0.95rem] text-gray-aaa">
          문제가 발생했거나 새로운 기능이 필요하다면 언제든 알려주세요!
        </p>
        <ul className="[&_a]:text-accent [&_a:hover]:underline [&_li]:mb-8">
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

      <div className="mt-40 border-t border-gray-333 pt-20 text-13 text-gray-aaa">
        <h3 className="mb-8 text-14 font-bold text-gray-e0e0e0">License</h3>
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
        <p>Copyright © {new Date().getFullYear()} 최홍제</p>
      </div>
    </div>
  );
}
