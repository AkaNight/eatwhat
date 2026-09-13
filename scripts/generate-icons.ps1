Add-Type -AssemblyName System.Drawing

function New-EatWhatIcon {
  param(
    [Parameter(Mandatory = $true)][int]$Size,
    [Parameter(Mandatory = $true)][string]$OutputPath
  )

  $bitmap = [System.Drawing.Bitmap]::new($Size, $Size)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $scale = $Size / 512.0
  $orange = [System.Drawing.Color]::FromArgb(255, 107, 53)
  $cream = [System.Drawing.Color]::FromArgb(255, 248, 243)
  $orangeBrush = [System.Drawing.SolidBrush]::new($orange)
  $creamBrush = [System.Drawing.SolidBrush]::new($cream)

  try {
    $graphics.Clear($orange)
    $graphics.FillEllipse($creamBrush, 92 * $scale, 92 * $scale, 328 * $scale, 328 * $scale)

    $bowl = [System.Drawing.Drawing2D.GraphicsPath]::new()
    try {
      $bowl.AddLine(142 * $scale, 246 * $scale, 370 * $scale, 246 * $scale)
      $bowl.AddBezier(370 * $scale, 246 * $scale, 370 * $scale, 335 * $scale, 327 * $scale, 388 * $scale, 256 * $scale, 388 * $scale)
      $bowl.AddBezier(256 * $scale, 388 * $scale, 185 * $scale, 388 * $scale, 142 * $scale, 335 * $scale, 142 * $scale, 246 * $scale)
      $bowl.CloseFigure()
      $graphics.FillPath($orangeBrush, $bowl)
    } finally {
      $bowl.Dispose()
    }

    $steamPen = [System.Drawing.Pen]::new($orange, 34 * $scale)
    $steamPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $steamPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    try {
      $graphics.DrawArc($steamPen, 177 * $scale, 124 * $scale, 158 * $scale, 186 * $scale, 190, 160)
    } finally {
      $steamPen.Dispose()
    }

    $highlightPen = [System.Drawing.Pen]::new($cream, 24 * $scale)
    $highlightPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $highlightPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    try {
      $graphics.DrawLine($highlightPen, 202 * $scale, 299 * $scale, 310 * $scale, 299 * $scale)
    } finally {
      $highlightPen.Dispose()
    }

    $bitmap.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  } finally {
    $orangeBrush.Dispose()
    $creamBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }
}

$publicDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public'))
New-EatWhatIcon -Size 192 -OutputPath (Join-Path $publicDirectory 'pwa-192x192.png')
New-EatWhatIcon -Size 512 -OutputPath (Join-Path $publicDirectory 'pwa-512x512.png')
New-EatWhatIcon -Size 512 -OutputPath (Join-Path $publicDirectory 'pwa-maskable-512x512.png')
