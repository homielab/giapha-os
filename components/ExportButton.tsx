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

import { useI18n } from '@/lib/i18n/useI18n'

export default function ExportButton() {
  const [isExporting, setIsExporting] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useI18n()
  const menuRef = useRef<HTMLDivElement>(null)
  const errorTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Browsers cap canvas dimensions (Safari iOS ~4096-8192px, desktop ~16384px).
  // Scale pixelRatio down for large trees so html-to-image doesn't throw.
  const getSafePixelRatio = (width: number, height: number) => {
    const MAX_CANVAS_DIMENSION = 8192
    const longestSide = Math.max(width, height, 1)
    return Math.max(1, Math.min(2, MAX_CANVAS_DIMENSION / longestSide))
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
    // Loaded on click so the tree views don't ship the export libraries.
    const { toPng } = await import('html-to-image')
    const url = await toPng(element, {
      backgroundColor: '#f5f5f4',
      cacheBust: true,
      height,
      pixelRatio: getSafePixelRatio(width, height),
      style: {
        height: `${height}px`,
        transform: 'none',
        transformOrigin: 'top left',
        width: `${width}px`
      },
      width
    })
    downloadDataUrl(
      url,
      `giapha-sodo-${new Date().toISOString().split('T')[0]}.png`
    )
  }

  const handleExportPdf = async (element: HTMLElement) => {
    const { height: cssHeight, width: cssWidth } = getExportSize(element)
    const pixelRatio = getSafePixelRatio(cssWidth, cssHeight)
    const [{ toPng }, { jsPDF }] = await Promise.all([
      import('html-to-image'),
      import('jspdf')
    ])

    const imgData = await toPng(element, {
      backgroundColor: '#f5f5f4',
      cacheBust: true,
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

    const pdf = new jsPDF({
      compress: true,
      format: [pdfWidth, pdfHeight],
      orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
      unit: 'pt'
    })
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')
    pdf.save(`giapha-sodo-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleExport = async (format: 'png' | 'pdf') => {
    try {
      setIsExporting(true)
      setShowMenu(false)
      setError(null)

      // Add a small delay to allow UI to update (close menu) before capturing
      await new Promise((resolve) => setTimeout(resolve, 100))

      const element = document.getElementById('export-container')
      if (!element) throw new Error(t('exportError'))

      if (format === 'png') {
        await handleExportPng(element)
      } else {
        await handleExportPdf(element)
      }
    } catch (err) {
      console.error('Export error:', err)
      setError(t('exportError'))
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current)
      errorTimeoutRef.current = setTimeout(() => setError(null), 5000)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className='relative' ref={menuRef}>
      <button
        onClick={() => setShowMenu(!showMenu)}
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
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className='absolute top-full right-0 z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-stone-200/60 bg-white/90 py-2 backdrop-blur-xl sm:right-auto sm:left-0'>
            <button
              onClick={() => handleExport('png')}
              className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700'>
              <FileImage className='size-4' />
              {t('saveAsImage')}
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className='flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-stone-700 transition-colors hover:bg-amber-50 hover:text-amber-700'>
              <FileText className='size-4' />
              {t('saveAsPdf')}
            </button>
          </m.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <m.div
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
