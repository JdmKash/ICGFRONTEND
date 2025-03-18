import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { selectUser } from "../features/userSlice";
import { selectTopUsers, setTopUsers } from "../features/topUsersSlice";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import "../styles/Liders.css";

function Liders() {
  const dispatch = useDispatch();
  const user = useSelector(selectUser);
  const topUsers = useSelector(selectTopUsers);
  const [isLoading, setIsLoading] = useState(true);

  // Format number with commas for thousands
  const formatNumber = (num) => {
    return num ? num.toLocaleString(undefined, { maximumFractionDigits: 3 }) : "0";
  };

  // Fetch top users from Firestore
  useEffect(() => {
    const fetchTopUsers = async () => {
      setIsLoading(true);
      try {
        const usersRef = collection(db, "users");
        const q = query(usersRef, orderBy("balance", "desc"), limit(10));
        const querySnapshot = await getDocs(q);
        
        const users = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          users.push({
            id: doc.id,
            firstName: userData.firstName || "Unknown",
            lastName: userData.lastName || "",
            userName: userData.userName || "",
            balance: userData.balance || 0
          });
        });
        
        console.log("Fetched top users:", users.length);
        dispatch(setTopUsers(users));
      } catch (error) {
        console.error("Error fetching top users:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchTopUsers();
    
    // Set up interval to refresh leaderboard every 5 minutes
    const interval = setInterval(fetchTopUsers, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [dispatch]);

  // Find current user's rank
  const findUserRank = () => {
    if (!user || !topUsers || topUsers.length === 0) return "N/A";
    
    const userIndex = topUsers.findIndex(u => u.id === user.uid);
    return userIndex !== -1 ? (userIndex + 1) : "N/A";
  };

  return (
    <div className="liders-container">
      <h2 className="liders-title">Leaderboard</h2>
      
      {isLoading ? (
        <div className="loading">Loading leaderboard...</div>
      ) : (
        <>
          <div className="user-rank">
            Your Rank: {findUserRank()}
          </div>
          
          <div className="leaderboard">
            {topUsers && topUsers.length > 0 ? (
              topUsers.map((topUser, index) => {
                // Log each user for debugging
                console.log(`User ${index + 1}:`, {
                  id: topUser.id,
                  userName: topUser.userName,
                  firstName: topUser.firstName,
                  lastName: topUser.lastName
                });
                
                return (
                  <div 
                    key={topUser.id} 
                    className={`leaderboard-item ${user && topUser.id === user.uid ? 'current-user' : ''}`}
                  >
                    <span className="rank">{index + 1}</span>
                    <span className="name">
                      {topUser.firstName} {topUser.lastName}
                      {topUser.userName && ` (@${topUser.userName})`}
                    </span>
                    <span className="balance">₿ {formatNumber(topUser.balance)}</span>
                  </div>
                );
              })
            ) : (
              <div className="no-data">No leaderboard data available</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default Liders;
