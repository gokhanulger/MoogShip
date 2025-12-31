import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { InfoIcon, ChevronDownIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import etsyDownloadImg from "@/assets/image_1744397070842.png";
import etsyDownloadButtonImg from "@/assets/image_1744397284232.png";

export function EtsyImportGuide() {
  const { t } = useTranslation();
  return (
    <Collapsible className="mb-6">
      <Card className="border border-blue-100 bg-gradient-to-r from-blue-50 to-blue-100">
        <CollapsibleTrigger
          className="w-full text-left"
          asChild
          aria-label={t("etsyImportGuide.toggleGuide")}
        >
          <CardHeader className="pb-4 cursor-pointer hover:bg-blue-100 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <InfoIcon className="h-6 w-6 mr-2 text-blue-500" />
                <div>
                  <CardTitle className="text-xl text-blue-700">
                    {t("etsyImportGuide.title")}
                  </CardTitle>
                  <CardDescription className="text-blue-700 text-base">
                    {t("etsyImportGuide.description")}
                  </CardDescription>
                </div>
              </div>
              <ChevronDownIcon className="h-6 w-6 text-blue-500 transition-transform data-[state=open]:rotate-180" />
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Left Column - Steps 1-2 */}
              <div className="space-y-5">
                {/* Step 1 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-2">
                      1
                    </div>
                    <h3 className="font-semibold text-blue-800">
                      {t("etsyImportGuide.step1.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    {t("etsyImportGuide.step1.description")}
                  </p>
                  <div className="flex items-center justify-between">
                    <a
                      href="https://www.etsy.com/your/shops/me/download"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 underline hover:text-blue-800 text-sm"
                    >
                      {t("etsyImportGuide.step1.downloadUrl")}
                    </a>
                    <svg
                      className="h-10 w-10 text-blue-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                      />
                    </svg>
                  </div>
                </div>

                {/* Step 2 - Below Step 1 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center mb-3">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-2">
                      2
                    </div>
                    <h3 className="font-semibold text-blue-800">
                      {t("etsyImportGuide.step2.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-2">
                    {t("etsyImportGuide.step2.description")}{" "}
                    <span className="font-medium">
                      {t("etsyImportGuide.step2.ordersLabel")}
                    </span>
                    . {t("etsyImportGuide.step2.timeSelection")}
                  </p>

                  <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                    <img
                      src={etsyDownloadImg}
                      alt={t("etsyImportGuide.step2.imageAlt")}
                      className="w-full rounded-sm mx-auto"
                    />
                  </div>

                  <p className="text-sm text-blue-700 mt-3">
                    <span className="font-semibold text-blue-800">
                      {t("common.tip")}:
                    </span>{" "}
                    {t("etsyImportGuide.step2.tip")}
                  </p>
                </div>
              </div>

              {/* Right Column - Steps 3-5 */}
              <div className="space-y-5">
                {/* Step 3 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-2">
                      3
                    </div>
                    <h3 className="font-semibold text-blue-800">
                      {t("etsyImportGuide.step3.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    {t("etsyImportGuide.step3.description")}
                  </p>
                  <div className="mb-3 mt-2 p-2 border border-gray-200 rounded-md bg-blue-50">
                    <div className="flex flex-col items-center">
                      <div className="flex items-center text-gray-700 text-sm mb-2">
                        <svg
                          className="h-4 w-4 mr-1 text-blue-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span>
                          {t("etsyImportGuide.step3.fromEmail")}:
                          noreply@mail.etsy.com
                        </span>
                      </div>
                      <div className="bg-blue-100 rounded px-4 py-2 text-blue-700 text-sm font-medium">
                        <img
                          src={etsyDownloadButtonImg}
                          alt={t("etsyImportGuide.step4.imageAlt")}
                          className="w-full rounded-sm mx-auto"
                        />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 mt-3">
                    <span className="font-semibold">{t("common.note")}:</span>{" "}
                    {t("etsyImportGuide.step3.note")}
                  </p>
                </div>

                {/* Step 4 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-2">
                      4
                    </div>
                    <h3 className="font-semibold text-blue-800">
                      {t("etsyImportGuide.step4.title")}
                    </h3>
                  </div>

                  <p className="text-sm text-blue-700 mb-3">
                    {t("etsyImportGuide.step4.description")}
                  </p>
                  <div className="mt-2 flex justify-center">
                    <div className="px-4 py-2 border-2 border-dashed border-blue-300 rounded-md text-center text-sm text-blue-600 w-full">
                      <svg
                        className="h-8 w-8 mx-auto text-blue-400 mb-1"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      {t("common.dragDropOrBrowse")}
                    </div>
                  </div>
                </div>

                {/* Step 5 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-blue-200">
                  <div className="flex items-center mb-2">
                    <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-800 font-bold mr-2">
                      5
                    </div>
                    <h3 className="font-semibold text-blue-800">
                      {t("etsyImportGuide.step5.title")}
                    </h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-3">
                    {t("etsyImportGuide.step5.description")}
                  </p>
                  <div className="mt-2 flex justify-center bg-gray-50 p-2 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="bg-white border border-gray-300 px-2 py-1 rounded text-center text-sm w-14">
                        <div className="text-xs text-gray-500">
                          {t("common.dimensionDetails.length")}
                        </div>
                        <div>15 cm</div>
                      </div>
                      <div className="text-gray-400">×</div>
                      <div className="bg-white border border-gray-300 px-2 py-1 rounded text-center text-sm w-14">
                        <div className="text-xs text-gray-500">
                          {t("common.dimensionDetails.width")}
                        </div>
                        <div>15 cm</div>
                      </div>
                      <div className="text-gray-400">×</div>
                      <div className="bg-white border border-gray-300 px-2 py-1 rounded text-center text-sm w-14">
                        <div className="text-xs text-gray-500">
                          {t("common.dimensionDetails.height")}
                        </div>
                        <div>5 cm</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-300 shadow-sm">
              <div className="flex items-start">
                <svg
                  className="h-6 w-6 text-yellow-500 mr-3 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <h4 className="text-base font-bold text-yellow-800 mb-1">
                    {t("etsyImportGuide.important.title")}
                  </h4>
                  <p className="text-sm font-medium text-yellow-700">
                    {t("etsyImportGuide.important.defaultDimensions")}:{" "}
                    <span className="font-bold">15×15×5 cm, 0.5 kg</span>
                  </p>
                  <p className="text-sm text-yellow-600 mt-1">
                    {t("etsyImportGuide.important.warning")}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export default EtsyImportGuide;
