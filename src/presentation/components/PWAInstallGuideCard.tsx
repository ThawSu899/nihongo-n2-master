import React, { useState } from 'react';
import {
  Smartphone,
  Copy,
  Check,
  Share2,
  Download,
  CheckCircle,
  Apple,
  Laptop,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export const LIVE_APP_URL = 'https://nihongo-n2-master-rewv.vercel.app';

interface PWAInstallGuideCardProps {
  isInstalled?: boolean;
  deferredPrompt?: any;
  onInstall?: () => void;
}

export const PWAInstallGuideCard: React.FC<PWAInstallGuideCardProps> = ({
  isInstalled,
  deferredPrompt,
  onInstall,
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [activePlatform, setActivePlatform] = useState<'ios' | 'android' | 'desktop'>('android');

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(LIVE_APP_URL);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = LIVE_APP_URL;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      // ignore
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Nihongo N2 Master - JLPT Study OS',
          text: 'ဂျပန်စာ JLPT စာမေးပွဲ အောင်မြင်ရန် အပြည့်စုံဆုံး မြန်မာဘာသာဖြင့် လေ့လာနိုင်သော App',
          url: LIVE_APP_URL,
        });
      } catch {
        // user cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700">
              <Smartphone className="w-4 h-4" />
            </span>
            <span className="text-xs font-mono font-bold text-indigo-700 uppercase">
              PWA Install &amp; Share Hub
            </span>
            <span className="text-stone-300">•</span>
            <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              100% Offline Ready
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-stone-900 tracking-tight mt-1 font-myanmar">
            📲 ဖုန်းနှင့် ကွန်ပျူတာတွင် App သွင်းနည်း (PWA Setup Guide)
          </h2>
          <p className="text-xs text-stone-600 mt-0.5 font-myanmar">
            App Store သို့မဟုတ် Play Store သွားစရာမလိုဘဲ ဖုန်းနှင့် ကွန်ပျူတာပေါ်တွင် တိုက်ရိုက် Native App အဖြစ် သွင်းယူအသုံးပြုနိုင်ပါသည်။
          </p>
        </div>

        {/* Status Badge */}
        {isInstalled && (
          <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>Installed as Standalone App</span>
          </div>
        )}
      </div>

      {/* 1-Click Live App Link Copy Bar */}
      <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1 min-w-0">
          <div className="text-[11px] font-mono text-stone-500 uppercase tracking-wider font-semibold">
            Official Live Production URL (တရားဝင် လင့်ခ်):
          </div>
          <div className="font-mono text-xs sm:text-sm font-bold text-indigo-700 truncate select-all">
            {LIVE_APP_URL}
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition active:scale-95 flex items-center space-x-1.5 cursor-pointer shadow-xs ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white hover:bg-stone-100 text-stone-800 border border-stone-200'
            }`}
            title="Copy Live App Link"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 text-stone-500" />}
            <span className="font-myanmar text-[11px]">
              {copied ? '✓ Link Copied! (ကူးယူပြီးပါပြီ)' : 'Copy Live App Link'}
            </span>
          </button>

          {/* Share Button */}
          <button
            onClick={handleNativeShare}
            className="p-2 rounded-xl bg-white hover:bg-stone-100 text-stone-700 border border-stone-200 transition cursor-pointer shadow-xs"
            title="Share app with friends"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Platform Switcher Tabs */}
      <div className="space-y-3">
        <div className="flex items-center space-x-1 bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => setActivePlatform('android')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activePlatform === 'android'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Android (Chrome)</span>
          </button>

          <button
            onClick={() => setActivePlatform('ios')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activePlatform === 'ios'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Apple className="w-3.5 h-3.5" />
            <span>iPhone / iPad (Safari)</span>
          </button>

          <button
            onClick={() => setActivePlatform('desktop')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-1.5 cursor-pointer ${
              activePlatform === 'desktop'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Laptop className="w-3.5 h-3.5" />
            <span>Windows / Mac (PC)</span>
          </button>
        </div>

        {/* Step-by-Step Instructions in Burmese */}
        <div className="bg-stone-50/70 border border-stone-200 rounded-xl p-4 sm:p-5">
          {activePlatform === 'android' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold text-stone-900 flex items-center space-x-1.5 font-myanmar">
                <span>🤖 Android ဖုန်းများတွင် သွင်းနည်း (Samsung, Xiaomi, Vivo, Oppo စသည်)</span>
              </h3>
              <ol className="space-y-2.5 text-xs text-stone-700 font-myanmar leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၁
                  </span>
                  <span>
                    <strong>Google Chrome</strong> သို့မဟုတ် <strong>Samsung Internet</strong> ဖြင့် အထက်ပါ လင့်ခ်ကို ဖွင့်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၂
                  </span>
                  <span>
                    မျက်နှာပြင် ညာဘက်အပေါ်ထောင့်ရှိ အစက်သုံးစက် မီနူး (<strong>⋮</strong>) ကို နှိပ်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၃
                  </span>
                  <span>
                    <strong>"Install app"</strong> သို့မဟုတ် <strong>"Add to Home screen (ပင်မစခရင်သို့ ထည့်ရန်)"</strong> ကို ရွေးချယ်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၄
                  </span>
                  <span>
                    <strong>"Install"</strong> ကို အတည်ပြုလိုက်ပါက သင့်ဖုန်းတွင် သီးသန့် App အဖြစ် ထည့်သွင်းပြီးစီးပြီး အင်တာနက်မရှိချိန်တွင်လည်း အပြည့်အဝ အသုံးပြုနိုင်ပါပြီ။
                  </span>
                </li>
              </ol>
            </div>
          )}

          {activePlatform === 'ios' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold text-stone-900 flex items-center space-x-1.5 font-myanmar">
                <span>🍏 iPhone &amp; iPad များတွင် သွင်းနည်း (iOS Safari)</span>
              </h3>
              <ol className="space-y-2.5 text-xs text-stone-700 font-myanmar leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၁
                  </span>
                  <span>
                    iPhone ၏ မူရင်း <strong>Safari Browser</strong> ဖြင့် လင့်ခ်ကို ဖွင့်ပါ (Chrome ထက် Safari ဖြင့် သွင်းခြင်းက ပိုမို အဆင်ပြေပါသည်)။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၂
                  </span>
                  <span>
                    မျက်နှာပြင် အောက်ခြေ အလယ်ရှိ <strong>Share ခလုတ်</strong> (ထောင့်မှန်စတုဂံထဲမှ မြှား အပေါ်ထွက်နေသောပုံ ⎋) ကို နှိပ်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၃
                  </span>
                  <span>
                    မီနူးတွင် အောက်သို့ အနည်းငယ်ဆွဲချပြီး <strong>"Add to Home Screen (ပင်မစာမျက်နှာသို့ ထည့်မည်)"</strong> ကို ရွေးပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၄
                  </span>
                  <span>
                    ညာဘက်အပေါ်ထောင့်ရှိ <strong>"Add"</strong> ကို နှိပ်လိုက်ပါက သင့် iPhone မျက်နှာပြင်တွင် App icon အဖြစ် ပေါ်လာပါမည်။
                  </span>
                </li>
              </ol>
            </div>
          )}

          {activePlatform === 'desktop' && (
            <div className="space-y-3 animate-in fade-in duration-150">
              <h3 className="text-xs font-bold text-stone-900 flex items-center space-x-1.5 font-myanmar">
                <span>💻 Windows PC &amp; Mac ကွန်ပျူတာများတွင် သွင်းနည်း (Edge / Chrome)</span>
              </h3>
              <ol className="space-y-2.5 text-xs text-stone-700 font-myanmar leading-relaxed">
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၁
                  </span>
                  <span>
                    <strong>Google Chrome</strong> သို့မဟုတ် <strong>Microsoft Edge</strong> ဖြင့် လင့်ခ်ကို ဖွင့်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၂
                  </span>
                  <span>
                    Address Bar (လိပ်စာဘား) ၏ ညာဘက်အစွန်တွင် ပေါ်နေသော <strong>Install Icon (🖥️ ကွန်ပျူတာပုံ သို့မဟုတ် + ပုံ)</strong> ကို နှိပ်ပါ။
                  </span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5">
                    ၃
                  </span>
                  <span>
                    <strong>"Install"</strong> ကို နှိပ်လိုက်ပါက Desktop ပေါ်တွင် Shortcut icon အဖြစ် ရောက်ရှိပြီး သီးသန့် Desktop Software ကဲ့သို့ ဖွင့်လှစ် အသုံးပြုနိုင်ပါပြီ။
                  </span>
                </li>
              </ol>
            </div>
          )}
        </div>

        {/* Direct Install prompt button if available */}
        {deferredPrompt && !isInstalled && onInstall && (
          <div className="pt-1 flex justify-end">
            <button
              onClick={onInstall}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs active:scale-95 flex items-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span className="font-myanmar">📲 ဤစက်ထဲသို့ App ချက်ချင်း ထည့်သွင်းမည် (Install App)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
