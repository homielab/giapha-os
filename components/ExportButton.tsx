'use client'

import { AnimatePresence, m } from 'framer-motion'
import {
  AlertCircle,
  Download,
  FileImage,
  FileText,
  Loader2,
  X
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { usePopupMenu } from '@/hooks/usePopupMenu'
import { useI18n } from '@/lib/i18n/useI18n'
import { noticeAria } from '@/utils/a11y'
import { formatIsoDay } from '@/utils/dateHelpers'
import { keepInExport } from '@/utils/exportFilter'
import {
  canvasLimitsFor,
  ExportTooLargeError,
  safePixelRatio
} from '@/utils/exportScale'
import {
  choosePdfLayout,
  PDF_OVERLAP_PT,
  planPdfTiles,
  type PdfPageFormat
} from '@/utils/pdfTiles'

const PDF_FORMAT_KEY = 'giapha-pdf-format'
const PDF_FORMATS: PdfPageFormat[] = ['single', 'a4', 'a3']

// The menu is closed while hydrating, so reading storage here cannot mismatch.
function readSavedPdfFormat(): PdfPageFormat {
  if (typeof window === 'undefined') return 'single'
  try {
    const saved = localStorage.getItem(PDF_FORMAT_KEY)
    if (PDF_FORMATS.includes(saved as PdfPageFormat)) {
      return saved as PdfPageFormat
    }
  } catch {
    // Storage can be blocked; the default format still works.
  }
  return 'single'
}

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pdfFormat, setPdfFormat] = useState<PdfPageFormat>(readSavedPdfFormat)
  const { t } = useI18n()
  const {
    isOpen: showMenu,
    close: closeMenu,
    toggle: toggleMenu,
    containerRef,
    buttonRef,
    menuId,
    buttonProps
  } = usePopupMenu()
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
    },
    []
  )

  const getExportSize = (element: HTMLElement) => {
    const width = Math.ceil(
      Math.max(element.scrollWidth, element.offsetWidth, element.clientWidth)
    )
    const height = Math.ceil(
      Math.max(element.scrollHeight, element.offsetHeight, element.clientHeight)
    )
    return { height, width }
  }

  // Browsers cap canvas size (Safari ~16.7M px area, mobile sides ~8192px),
  // so large trees are rasterized below 1x instead of failing in html-to-image.
  const getPixelRatio = (width: number, height: number) => {
    const { ratio, tooLarge } = safePixelRatio(
      width,
      height,
      canvasLimitsFor(navigator.userAgent, navigator.maxTouchPoints)
    )
    if (tooLarge) throw new ExportTooLargeError()
    return ratio
  }

  const downloadDataUrl = (url: string, filename: string) => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const loadImage = (src: string) =>
    new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = src
    })

  const handleExportPng = async (element: HTMLElement) => {
    const { height, width } = getExportSize(element)
    const pixelRatio = getPixelRatio(width, height)
    // Loaded on click so the tree views don't ship the export libraries.
    const { toPng } = await import('html-to-image')
    const url = await toPng(element, {
      backgroundColor: '#f5f5f4',
      cacheBust: true,
      filter: keepInExport,
      height,
      pixelRatio,
      style: {
        height: `${height}px`,
        transform: 'none',
        transformOrigin: 'top left',
        width: `${width}px`
      },
      width
    })
    downloadDataUrl(url, `giapha-sodo-${formatIsoDay()}.png`)
  }

  const handleExportPdf = async (
    element: HTMLElement,
    format: PdfPageFormat
  ) => {
    const { height: cssHeight, width: cssWidth } = getExportSize(element)
    const pixelRatio = getPixelRatio(cssWidth, cssHeight)
    const [{ toPng }, { jsPDF }] = await Promise.all([
      import('html-to-image'),
      import('jspdf')
    ])

    const imgData = await toPng(element, {
      backgroundColor: '#f5f5f4',
      cacheBust: true,
      filter: keepInExport,
      height: cssHeight,
      pixelRatio,
      style: {
        height: `${cssHeight}px`,
        transform: 'none',
        transformOrigin: 'top left',
        width: `${cssWidth}px`
      },
      width: cssWidth
    })

    // Measure the rasterized image (CSS px * pixelRatio) so the PDF page
    // matches the actual bitmap aspect ratio instead of assuming scroll size.
    const img = await loadImage(imgData)
    const imgWidth = img.naturalWidth || Math.round(cssWidth * pixelRatio)
    const imgHeight = img.naturalHeight || Math.round(cssHeight * pixelRatio)

    // jsPDF works in points (1/72 inch). CSS px are 1/96 inch, so convert
    // with 72/96. Using unit 'px' without the px_scaling hotfix inverts the
    // scale and produces wrong-sized pages, so use 'pt' explicitly.
    const PX_TO_PT = 72 / 96
    const MAX_PDF_DIMENSION_PT = 14400 // jsPDF hard limit per page side
    let pdfWidth = imgWidth * PX_TO_PT
    let pdfHeight = imgHeight * PX_TO_PT
    const longestSide = Math.max(pdfWidth, pdfHeight)
    if (longestSide > MAX_PDF_DIMENSION_PT) {
      const scale = MAX_PDF_DIMENSION_PT / longestSide
      pdfWidth *= scale
      pdfHeight *= scale
    }

    const filename = `giapha-sodo-${formatIsoDay()}.pdf`

    if (format !== 'single') {
      // Portrait or landscape, whichever takes fewer sheets; the scale keeps
      // the tree legible on paper.
      const page = choosePdfLayout(cssWidth, cssHeight, format)
      // Points per bitmap pixel.
      const ptPerPx = page.scale / pixelRatio
      const plan = planPdfTiles(
        imgWidth * ptPerPx,
        imgHeight * ptPerPx,
        page.width,
        page.height,
        PDF_OVERLAP_PT
      )
      const tiled = new jsPDF({
        compress: true,
        format: [page.width, page.height],
        orientation: page.orientation,
        unit: 'pt'
      })
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')
      const total = plan.tiles.length
      plan.tiles.forEach((tile, index) => {
        if (index > 0) {
          tiled.addPage([page.width, page.height], page.orientation)
        }
        const sx = Math.round(tile.x / ptPerPx)
        const sy = Math.round(tile.y / ptPerPx)
        const sw = Math.min(Math.round(tile.w / ptPerPx), imgWidth - sx)
        const sh = Math.min(Math.round(tile.h / ptPerPx), imgHeight - sy)
        canvas.width = sw
        canvas.height = sh
        ctx.fillStyle = '#f5f5f4'
        ctx.fillRect(0, 0, sw, sh)
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh)
        tiled.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          0,
          0,
          sw * ptPerPx,
          sh * ptPerPx,
          undefined,
          'FAST'
        )
        const label = `${t('pdfPageLabel')} ${tile.row + 1},${tile.col + 1} / ${plan.rows}x${plan.cols} (${index + 1}/${total})`
        tiled.setFontSize(8)
        const textWidth = tiled.getTextWidth(label)
        tiled.setFillColor(255, 255, 255)
        tiled.rect(
          page.width - textWidth - 12,
          page.height - 16,
          textWidth + 8,
          12,
          'F'
        )
        tiled.setTextColor(87, 83, 78)
        tiled.text(label, page.width - 8, page.height - 7, { align: 'right' })
      })
      tiled.save(filename)
      return
    }

    const pdf = new jsPDF({
      compress: true,
      format: [pdfWidth, pdfHeight],
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'pt'
    })
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    pdf.save(filename)
  }

  const handleExport = async (format: 'png' | PdfPageFormat) => {
    try {
      setIsExporting(true)
      closeMenu()
      setError(null)
      if (format !== 'png') {
        setPdfFormat(format)
        try {
          localStorage.setItem(PDF_FORMAT_KEY, format)
        } catch {
          // Remembering the choice is optional.
        }
      }

      // Add a small delay to allow UI to update (close menu) before capturing
      await new Promise((resolve) => setTimeout(resolve, 100))

      const element = document.getElementById('export-container')
      if (!element) throw new Error(t('exportError'))

      if (format === 'png') {
        await handleExportPng(element)
      } else {
        await handleExportPdf(element, format)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError(
        t(err instanceof ExportTooLargeError ? 'exportTooLarge' : 'exportError')
      )
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className='relative' ref={containerRef}>
      <button
        type='button'
        ref={buttonRef}
        {...buttonProps}
        onClick={toggleMenu}
        disabled={isExporting}
        className={`flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${
          showMenu
            ? 'border-amber-200 bg-amber-100/90 text-amber-800'
            : 'border-stone-200/60 bg-white/80 text-stone-600 backdrop-blur-md hover:bg-white hover:text-stone-900'
        }`}>
        {isExporting ? (
          <Loader2 className='size-4 shrink-0 animate-spin' />
        ) : (
          <Download className='size-4 shrink-0' />
        )}
        <span className='hidden min-w-max sm:inline'>
          {isExporting ? t('exporting') : t('exportFile')}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && !isExporting && (
          <m.div
            id={menuId}
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className='absolute top-full right-0 z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-stone-200/60 bg-white/90 py-2 backdrop-blur-xl sm:right-auto sm:left-0'>
            <button
              type='button'
              onClick={() => handleExport('png')}
              className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700'>
              <FileImage className='size-4' />
              {t('saveAsImage')}
            </button>
            {PDF_FORMATS.map((format) => (
              <button
                type='button'
                key={format}
                onClick={() => handleExport(format)}
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors hover:bg-amber-50 hover:text-amber-700 ${
                  pdfFormat === format ? 'text-amber-700' : 'text-stone-700'
                }`}>
                <FileText className='size-4 shrink-0' />
                {format === 'single'
                  ? t('saveAsPdf')
                  : format === 'a4'
                    ? t('saveAsPdfA4')
                    : t('saveAsPdfA3')}
              </button>
            ))}
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <m.div
            {...noticeAria('error')}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className='absolute top-full right-0 z-50 mt-2 flex w-64 flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3'>
            <div className='flex items-start justify-between'>
              <div className='flex items-start gap-2'>
                <AlertCircle className='mt-0.5 h-4 w-4 shrink-0 text-red-500' />
                <span className='text-sm leading-snug font-medium text-red-800'>
                  {error}
                </span>
              </div>
              <button
                type='button'
                onClick={() => setError(null)}
                aria-label={t('clearError')}
                className='shrink-0 text-red-400 transition-colors hover:text-red-600'>
                <X className='h-4 w-4' />
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
