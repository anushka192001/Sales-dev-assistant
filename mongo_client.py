import pymongo
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional


class MongoClient:
    """
    Handles logging and conversation storage with a MongoDB collection.
    """

    def __init__(
        self,
        connection_string: str,
        db_name: str,
        conversations_collection: str = "conversations",
        open_router_logs_collection: str = "open_router_logs",
        clodura_api_collection: str = "clodura_api_collection",
    ):
        """
        Initializes the MongoDB connection.

        Args:
            connection_string: Your MongoDB connection string.
            db_name: The name of the database to use.
            collection_name: The name of the collection to store logs in.
        """
        self.client = pymongo.MongoClient(connection_string)
        self.db = self.client[db_name]
        self._create_collections_if_not_exist(
            conversations_collection,
            open_router_logs_collection,
            clodura_api_collection,
        )
        self.conversations_collection = self.db[conversations_collection]
        self.open_router_logs_collection = self.db[open_router_logs_collection]
        self.clodura_api_collection = self.db[clodura_api_collection]

    def _create_collections_if_not_exist(
        self,
        conversations_collection: str,
        open_router_logs_collection: str,
        clodura_api_collection: str,
    ):
        """
        Creates collections if they don't already exist
        Args:
            conversations_collection: Name of the conversations collection
            open_router_logs_collection: Name of the open router logs collection
        """
        collections_to_create = [
            conversations_collection,
            open_router_logs_collection,
            clodura_api_collection,
        ]

        for collection_name in collections_to_create:
            try:
                if collection_name not in self.db.list_collection_names():
                    self.db.create_collection(collection_name)
                    print(f"Created collection: {collection_name}")
                else:
                    print(f"Collection already exists: {collection_name}")
            except Exception as e:
                print(f"Error creating collection {collection_name}: {e}")

    def log_llm_request(self, log_data: Dict[str, Any]):
        """
        Inserts a new log entry into the MongoDB collection.

        Args:
            log_data: A dictionary containing the data to be logged.
        """
        log_data["timestamp"] = datetime.now(timezone.utc)
        self.open_router_logs_collection.insert_one(log_data)

    def log_clodura_api_request(self, log_data: Dict[str, Any]):
        log_data["timestamp"] = datetime.now(timezone.utc)
        self.clodura_api_collection.insert_one(log_data)

    def save_conversation(
        self,
        session_id: str,
        user_id: str,
        messages: List[Dict],
        tool_outputs: Optional[List[Dict]] = None,
        title: str = "New Chat",
    ) -> bool:
        """
        Saves or updates a conversation in the database.
        """
        try:
            query = {"session_id": session_id, "user_id": user_id}
            update = {
                "$set": {
                    "messages": messages,
                    "tool_outputs": tool_outputs or [],
                    "last_updated": datetime.now(timezone.utc),
                    "message_count": len(messages),
                    "title": title,
                }
            }
            self.conversations_collection.update_one(query, update, upsert=True)
            print(f"✅ Saved conversation for session in mongo db: {session_id}")
            return True
        except Exception as e:
            print(f"❌ Error saving conversation for session {session_id}: {e}")
            return False

    def load_conversation_with_tool_outputs(
        self, user_id: str, session_id: str
    ) -> Dict:
        """
        Loads a conversation from the database.
        """
        try:
            doc = self.conversations_collection.find_one(
                {"session_id": session_id, "user_id": user_id}
            )
            if doc:
                return {
                    "messages": doc.get("messages", []),
                    "tool_outputs": doc.get("tool_outputs", []),
                    "title": doc.get("title", "New Chat"),
                }
            return {"messages": [], "tool_outputs": [], "title": "New Chat"}
        except Exception as e:
            print(
                f"❌ Error loading conversation for session {session_id} from mongo db: {e}"
            )
            return {"messages": [], "tool_outputs": [], "title": "New Chat"}

    def delete_session(self, session_id: str) -> bool:
        """
        Deletes a session from the database.
        """
        try:
            self.conversations_collection.delete_one({"session_id": session_id})
            print(f"🗑️ Deleted session {session_id}")
            return True
        except Exception as e:
            print(f"❌ Error deleting session {session_id} from mongo db: {e}")
            return False

    def list_sessions_with_details(self, user_id: str) -> List[any]:
        """
        Lists all session IDs from the database.
        """
        try:
            return [
                {
                    "session_id": doc.get("session_id"),
                    "title": doc.get("title", "New Chat"),
                }
                for doc in self.conversations_collection.find(
                    {"user_id": user_id}, {"session_id": 1, "title": 1}
                )
            ]
        except Exception as e:
            print(f"❌ Error listing sessions: {e}")
            return []

    def get_session_summary(self, session_id: str) -> Dict:
        """
        Gets summary information about a session.
        """
        try:
            doc = self.conversations_collection.find_one({"session_id": session_id})
            if doc:
                tool_response_count = sum(
                    len(msg.get("tool_responses", []))
                    for msg in doc.get("messages", [])
                    if msg.get("role") == "assistant"
                )
                return {
                    "exists": True,
                    "session_id": session_id,
                    "message_count": doc.get("message_count", 0),
                    "tool_response_count": tool_response_count,
                    "last_updated": doc.get("last_updated"),
                }
            return {"exists": False}
        except Exception as e:
            print(f"❌ Error getting session summary for {session_id}: {e}")
            return {"exists": False, "error": str(e)}
