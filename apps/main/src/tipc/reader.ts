import fs from "node:fs"
import { createRequire } from "node:module"
import path from "node:path"

import { callGlobalContextMethod } from "@follow/shared/bridge"
import { app, BrowserWindow } from "electron"
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts"

import { readability } from "../lib/readability"
import { t } from "./_instance"

const require = createRequire(import.meta.url)
const tts = new MsEdgeTTS()

export const readerRoute = {
  readability: t.procedure.input<{ url: string }>().action(async ({ input }) => {
    const { url } = input

    if (!url) {
      return null
    }
    const result = await readability(url)

    return result
  }),

  tts: t.procedure
    .input<{
      id: string
      text: string
    }>()
    .action(async ({ input }) => {
      const { id, text } = input

      if (!text) {
        return null
      }

      const filePath = path.join(app.getPath("userData"), `${id}.webm`)
      if (fs.existsSync(filePath)) {
        return filePath
      } else {
        await tts.toFile(filePath, text)
        return filePath
      }
    }),

  getVoices: t.procedure.action(async ({ context: { sender } }) => {
    const window = BrowserWindow.fromWebContents(sender)
    try {
      const voices = await tts.getVoices()
      return voices
    } catch (error: any) {
      if (!window) {
        return
      }
      callGlobalContextMethod(window, "toast.error", [
        error.message,
        {
          duration: 1000,
        },
      ])
    }
  }),

  setVoice: t.procedure.input<string>().action(async ({ input, context: { sender } }) => {
    const window = BrowserWindow.fromWebContents(sender)
    if (!window) {
      return
    }

    await tts.setMetadata(input, OUTPUT_FORMAT.WEBM_24KHZ_16BIT_MONO_OPUS).catch((error) => {
      callGlobalContextMethod(window, "toast.error", [
        error.message,
        {
          duration: 1000,
        },
      ])
    })
  }),

  detectCodeStringLanguage: t.procedure
    .input<{ codeString: string }>()
    .action(async ({ input }) => {
      const { ModelOperations } = require("vscode-languagedetection")
      const modelOperations = new ModelOperations()
      const result = await modelOperations.runModel(input.codeString)
      return result
    }),
}
