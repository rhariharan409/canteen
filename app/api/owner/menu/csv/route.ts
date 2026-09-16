import { NextRequest, NextResponse } from 'next/server';
import Papa from 'papaparse';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req, ['OWNER', 'ADMIN']);
  if (auth.error || !auth.user) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const canteen = await db.canteen.findFirst({
      where: auth.user.role === 'ADMIN' ? {} : { ownerId: auth.user.id },
    });

    if (!canteen) {
      return NextResponse.json({ error: 'No canteen assigned to this owner account.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const confirmImport = formData.get('confirm') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No CSV file provided.' }, { status: 400 });
    }

    const text = await file.text();
    const parseResult = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });

    if (parseResult.errors && parseResult.errors.length > 0) {
      const syntaxError = parseResult.errors[0].message;
      return NextResponse.json({ error: `Malformed CSV file: ${syntaxError}` }, { status: 400 });
    }

    const rows = parseResult.data;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ error: 'CSV file is empty.' }, { status: 400 });
    }

    // Validate headers
    const sampleRow = rows[0];
    const headers = Object.keys(sampleRow).map((h) => h.trim().toLowerCase());

    const hasItemName = headers.some((h) => h.includes('item') || h.includes('name'));
    const hasCategory = headers.some((h) => h.includes('category'));
    const hasPrice = headers.some((h) => h.includes('price'));

    if (!hasItemName || !hasCategory || !hasPrice) {
      return NextResponse.json(
        {
          error:
            'Invalid CSV header format. CSV must contain columns: "Item Name", "Category", "Price".',
        },
        { status: 400 }
      );
    }

    const validItems: Array<{ name: string; category: string; price: number }> = [];
    const errors: string[] = [];
    const seenNames = new Set<string>();

    // Row-by-Row Validation
    rows.forEach((row, index) => {
      const rowNum = index + 2; // header is line 1

      // Find field values robustly
      const rawName = row['Item Name'] || row['Item'] || row['Name'] || '';
      const rawCategory = row['Category'] || 'General';
      const rawPrice = row['Price'] || '';

      const name = rawName.trim();
      const category = rawCategory.trim();
      const priceNum = parseFloat(rawPrice.toString().replace(/[^0-9.]/g, ''));

      if (!name) {
        errors.push(`Row ${rowNum}: Item Name is missing.`);
        return;
      }

      if (seenNames.has(name.toLowerCase())) {
        errors.push(`Row ${rowNum}: Duplicate item "${name}".`);
        return;
      }

      if (isNaN(priceNum) || priceNum < 0) {
        errors.push(`Row ${rowNum}: Invalid price "${rawPrice}" for item "${name}".`);
        return;
      }

      seenNames.add(name.toLowerCase());
      validItems.push({
        name,
        category,
        price: priceNum,
      });
    });

    if (errors.length > 0 && validItems.length === 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
          validItemsCount: 0,
          preview: [],
        },
        { status: 400 }
      );
    }

    // If confirm is false, return preview response for validation screen
    if (!confirmImport) {
      return NextResponse.json({
        success: true,
        previewMode: true,
        validCount: validItems.length,
        errors,
        previewItems: validItems,
      });
    }

    // Perform database insertion / upsert
    let createdCount = 0;
    let updatedCount = 0;

    for (const item of validItems) {
      const existing = await db.menuItem.findFirst({
        where: {
          canteenId: canteen.id,
          name: { equals: item.name },
        },
      });

      if (existing) {
        await db.menuItem.update({
          where: { id: existing.id },
          data: {
            category: item.category,
            price: item.price,
            active: true,
          },
        });
        updatedCount++;
      } else {
        await db.menuItem.create({
          data: {
            canteenId: canteen.id,
            name: item.name,
            category: item.category,
            price: item.price,
            active: true,
            currentStock: 0,
            stockMode: 'COUNT',
          },
        });
        createdCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `CSV Menu Import Complete! ${createdCount} items added, ${updatedCount} items updated.`,
      createdCount,
      updatedCount,
      errors,
    });
  } catch (error: any) {
    console.error('CSV Import Error:', error);
    return NextResponse.json({ error: 'Failed to parse and import CSV file.' }, { status: 500 });
  }
}
