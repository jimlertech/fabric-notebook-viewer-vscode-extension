[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$projectRoot = Split-Path -Parent $PSScriptRoot
$imagesPath = Join-Path $projectRoot 'images'
$outputPath = Join-Path $imagesPath 'icon.png'
New-Item -ItemType Directory -Force -Path $imagesPath | Out-Null

$source = [System.Drawing.Bitmap]::new(512, 512)
$graphics = [System.Drawing.Graphics]::FromImage($source)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

function New-RoundedRectanglePath([float]$x, [float]$y, [float]$width, [float]$height, [float]$radius) {
    $diameter = $radius * 2
    $path = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $path.AddArc($x, $y, $diameter, $diameter, 180, 90)
    $path.AddArc($x + $width - $diameter, $y, $diameter, $diameter, 270, 90)
    $path.AddArc($x + $width - $diameter, $y + $height - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($x, $y + $height - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

try {
    $backgroundPath = New-RoundedRectanglePath 24 24 464 464 84
    $backgroundBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        [System.Drawing.PointF]::new(50, 40),
        [System.Drawing.PointF]::new(460, 472),
        [System.Drawing.ColorTranslator]::FromHtml('#2637D8'),
        [System.Drawing.ColorTranslator]::FromHtml('#7A35C8')
    )
    $graphics.FillPath($backgroundBrush, $backgroundPath)

    $page = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $page.AddPolygon(@(
            [System.Drawing.PointF]::new(136, 92),
            [System.Drawing.PointF]::new(318, 92),
            [System.Drawing.PointF]::new(388, 162),
            [System.Drawing.PointF]::new(388, 420),
            [System.Drawing.PointF]::new(136, 420)
        ))
    $graphics.FillPath([System.Drawing.Brushes]::White, $page)

    $fold = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $fold.AddPolygon(@(
            [System.Drawing.PointF]::new(318, 92),
            [System.Drawing.PointF]::new(318, 164),
            [System.Drawing.PointF]::new(388, 164)
        ))
    $graphics.FillPath([System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#D8DCFF')), $fold)

    $cellColors = '#22B8CF', '#6D48E5', '#F3B63F'
    $cellWidths = 176, 136, 164
    $cellY = 204, 274, 344
    for ($index = 0; $index -lt $cellColors.Count; $index++) {
        $cellPath = New-RoundedRectanglePath 174 $cellY[$index] $cellWidths[$index] 38 10
        $cellBrush = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml($cellColors[$index]))
        $graphics.FillPath($cellBrush, $cellPath)
        $cellBrush.Dispose()
        $cellPath.Dispose()
    }

    $arrowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::White, 14)
    $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arrowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    foreach ($y in 223, 293) {
        $graphics.DrawLines($arrowPen, @(
                [System.Drawing.PointF]::new(92, $y - 15),
                [System.Drawing.PointF]::new(116, $y),
                [System.Drawing.PointF]::new(92, $y + 15)
            ))
        $graphics.DrawLine($arrowPen, 116, $y, 82, $y)
    }

    $output = [System.Drawing.Bitmap]::new(128, 128)
    $outputGraphics = [System.Drawing.Graphics]::FromImage($output)
    try {
        $outputGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $outputGraphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $outputGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $outputGraphics.DrawImage($source, 0, 0, 128, 128)
        $output.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $outputGraphics.Dispose()
        $output.Dispose()
    }
}
finally {
    if ($arrowPen) { $arrowPen.Dispose() }
    if ($fold) { $fold.Dispose() }
    if ($page) { $page.Dispose() }
    if ($backgroundBrush) { $backgroundBrush.Dispose() }
    if ($backgroundPath) { $backgroundPath.Dispose() }
    $graphics.Dispose()
    $source.Dispose()
}

Write-Output $outputPath