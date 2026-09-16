import { NextResponse } from 'next/server';

export async function GET() {
  const csvContent = `Item Name,Category,Price
Samosa,Snacks,15
Tea,Drinks,10
Vada,Snacks,12
Lemon Rice,Rice,40
Masala Dosa,Meals,50
`;

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="canteen_menu_template.csv"',
    },
  });
}
