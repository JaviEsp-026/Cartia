import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { ShoppingItem, ShoppingList as ListType } from '../types';

// Método para suscripción en tiempo real (Ideal para componentes React)
export function subscribeToShoppingList(
  userId: string,
  onUpdate: (list: ListType | null, items: ShoppingItem[]) => void
) {
  let unsubscribeItems: () => void;

  const qList = query(
    collection(db, 'shoppingLists'),
    where('userId', '==', userId)
  );

  const unsubscribeList = onSnapshot(qList, (snapshot) => {
    if (!snapshot.empty) {
      const listData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as ListType;
      
      const qItems = query(
        collection(db, 'shoppingItems'),
        where('listId', '==', listData.id)
      );

      if (unsubscribeItems) unsubscribeItems();
      
      unsubscribeItems = onSnapshot(qItems, (itemsSnapshot) => {
        const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
        onUpdate(listData, itemsData);
      });
    } else {
      onUpdate(null, []);
    }
  });

  return () => {
    unsubscribeList();
    if (unsubscribeItems) unsubscribeItems();
  };
}

// Método tradicional para obtener los datos una sola vez (Ideal para procesos background/asíncronos)
export async function getShoppingListItems(userId: string): Promise<{ list: ListType | null, items: ShoppingItem[] }> {
  const qList = query(collection(db, 'shoppingLists'), where('userId', '==', userId));
  const listSnapshot = await getDocs(qList);
  if (listSnapshot.empty) return { list: null, items: [] };
  
  const listData = { id: listSnapshot.docs[0].id, ...listSnapshot.docs[0].data() } as ListType;
  const qItems = query(collection(db, 'shoppingItems'), where('listId', '==', listData.id));
  const itemsSnapshot = await getDocs(qItems);
  
  const itemsData = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShoppingItem));
  return { list: listData, items: itemsData };
}