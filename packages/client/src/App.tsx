import { useEffect, useState } from 'react';
import './App.css';
import { Button } from './components/ui/button';

function App() {
   const [message, setMessage] = useState('');

   useEffect(() => {
      fetch('/api/hello')
         .then((res) => res.json())
         .then((data) => setMessage(data.message));
   }, []);

   return (
      <>
         <p className="font-bold">{message}</p>
         <Button className="mt-4" variant="outline">
            Click Me
         </Button>
      </>
   );
}

export default App;
