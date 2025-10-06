type ConvertGoogleSheetToRedirects = {
    googleSheetUrl: string;
    outputFile: string;
};
export default function convertGoogleSheetToRedirects({ googleSheetUrl, outputFile }: ConvertGoogleSheetToRedirects): Promise<void>;
export {};
