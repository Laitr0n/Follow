import { AnimatePresence, m } from "framer-motion"
import type { PropsWithChildren } from "react"
import { memo, useContext, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import { SwipeMedia } from "~/components/ui/media/SwipeMedia"
import { ReactVirtuosoItemPlaceholder } from "~/components/ui/placeholder"
import { Skeleton } from "~/components/ui/skeleton"
import { useRouteParamsSelector } from "~/hooks/biz/useRouteParams"
import { FeedViewType } from "~/lib/enum"
import { cn } from "~/lib/utils"
import { useEntry } from "~/store/entry/hooks"
import { useImageDimensions } from "~/store/image"

import { usePreviewMedia } from "../../../components/ui/media/hooks"
import { EntryItemWrapper } from "../layouts/EntryItemWrapper"
import { GridItem, GridItemFooter } from "../templates/grid-item-template"
import type { UniversalItemProps } from "../types"
import {
  MasonryIntersectionContext,
  useMasonryItemRatio,
  useMasonryItemWidth,
  useSetStableMasonryItemRatio,
} from "./contexts/picture-masonry-context"

export function PictureItem({ entryId, entryPreview, translation }: UniversalItemProps) {
  const entry = useEntry(entryId) || entryPreview

  const isActive = useRouteParamsSelector(({ entryId }) => entryId === entry?.entries.id)

  const { t } = useTranslation()
  const previewMedia = usePreviewMedia()
  if (!entry) return <ReactVirtuosoItemPlaceholder />
  return (
    <GridItem entryId={entryId} entryPreview={entryPreview} translation={translation}>
      <div className="relative flex gap-2 overflow-x-auto">
        {entry.entries.media ? (
          <SwipeMedia
            media={entry.entries.media}
            className={cn(
              "aspect-square",
              "w-full shrink-0 rounded-md",
              isActive && "rounded-b-none",
            )}
            imgClassName="object-cover"
            uniqueKey={entryId}
            onPreview={(media, i) => {
              previewMedia(media, i)
            }}
          />
        ) : (
          <div className="center aspect-square  w-full flex-col gap-1 rounded-md bg-muted text-xs text-muted-foreground">
            <i className="i-mgc-sad-cute-re size-6" />
            {t("entry_content.no_content")}
          </div>
        )}
      </div>
    </GridItem>
  )
}

const proxySize = {
  width: 600,
  height: 0,
}
export const PictureWaterFallItem = memo(function PictureWaterFallItem({
  entryId,
  entryPreview,
  translation,
  index,
}: UniversalItemProps & { index: number }) {
  const entry = useEntry(entryId) || entryPreview

  const isActive = useRouteParamsSelector(({ entryId }) => entryId === entry?.entries.id)

  const previewMedia = usePreviewMedia()
  const itemWidth = useMasonryItemWidth()

  const [ref, setRef] = useState<HTMLDivElement | null>(null)
  const intersectionObserver = useContext(MasonryIntersectionContext)

  useEffect(() => {
    if (!ref) return

    intersectionObserver.observe(ref)

    return () => {
      intersectionObserver.unobserve(ref)
    }
  }, [ref, intersectionObserver])

  const [isMouseEnter, setIsMouseEnter] = useState(false)
  if (!entry) return null

  return (
    <div
      ref={setRef}
      data-entry-id={entryId}
      data-index={index}
      onMouseEnter={() => setIsMouseEnter(true)}
      onMouseLeave={() => setIsMouseEnter(false)}
    >
      <EntryItemWrapper
        view={FeedViewType.Pictures}
        entry={entry}
        itemClassName="group hover:bg-theme-item-hover rounded-md"
        style={{
          width: itemWidth,
        }}
      >
        {entry.entries.media && entry.entries.media.length > 0 ? (
          <MasonryItemFixedDimensionWrapper url={entry.entries.media[0].url}>
            <SwipeMedia
              media={entry.entries.media}
              className={cn("w-full shrink-0 grow rounded-md", isActive && "rounded-b-none")}
              proxySize={proxySize}
              imgClassName="object-cover"
              uniqueKey={entryId}
              onPreview={previewMedia}
            />

            <AnimatePresence>
              {isMouseEnter && (
                <m.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute inset-x-0 -bottom-px z-[3] overflow-hidden rounded-b-md pb-1"
                  key="footer"
                >
                  <div className="absolute inset-x-0 bottom-0 h-[56px]" style={maskStyle}>
                    <div className="absolute inset-x-0 bottom-0 h-[56px] bg-gradient-to-t from-black/80 to-transparent" />
                  </div>
                  <GridItemFooter
                    entryId={entryId}
                    entryPreview={entryPreview}
                    translation={translation}
                    titleClassName="!text-white"
                    descriptionClassName="!text-white/80"
                    timeClassName="!text-white/60"
                  />
                </m.div>
              )}
            </AnimatePresence>
          </MasonryItemFixedDimensionWrapper>
        ) : (
          <div className="center aspect-video flex-col gap-1 rounded-md bg-muted text-xs text-muted-foreground">
            <i className="i-mgc-sad-cute-re size-6" />
            No media available
          </div>
        )}
      </EntryItemWrapper>
    </div>
  )
})

const maskStyle = {
  maskImage: "linear-gradient(rgba(255, 255, 255, 0) 0%, rgb(255, 255, 255) 10px)",
}
const MasonryItemFixedDimensionWrapper = (
  props: PropsWithChildren<{
    url: string
  }>,
) => {
  const { url, children } = props
  const dim = useImageDimensions(url)
  const itemWidth = useMasonryItemWidth()

  const itemHeight = dim ? itemWidth / dim.ratio : itemWidth
  const stableRadio = useState(() => itemWidth / itemHeight || 1)[0]
  const setItemStableRatio = useSetStableMasonryItemRatio()

  const stableRadioCtx = useMasonryItemRatio(url)

  useEffect(() => {
    setItemStableRatio(url, stableRadio)
  }, [setItemStableRatio, stableRadio, url])

  const style = useMemo(
    () => ({
      width: itemWidth,
      height: itemWidth / stableRadioCtx,
    }),
    [itemWidth, stableRadioCtx],
  )

  if (!style.height) return null

  return (
    <div className="relative flex h-full gap-2 overflow-x-auto overflow-y-hidden" style={style}>
      {children}
    </div>
  )
}

export const PictureItemSkeleton = (
  <div className="relative max-w-md rounded-md bg-theme-background text-zinc-700 transition-colors dark:text-neutral-400">
    <div className="relative">
      <div className="p-1.5">
        <div className="relative flex gap-2 overflow-x-auto">
          <div className="relative flex aspect-square w-full shrink-0 items-center overflow-hidden rounded-md">
            <Skeleton className="size-full overflow-hidden" />
          </div>
        </div>
        <div className="relative flex-1 px-2 pb-3 pt-1 text-sm">
          <div className="relative mb-1 mt-1.5 truncate font-medium leading-none">
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-1 flex items-center gap-1 truncate text-[13px]">
            <Skeleton className="mr-0.5 size-4" />
            <Skeleton className="h-3 w-1/2" />
            <span className="text-zinc-500">·</span>
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  </div>
)
