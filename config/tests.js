const HIRING_TESTS = [
  {
    id: "1",
    testName: "Senior Full-Stack Engineer Evaluation",
    description:
      "An extensive assessment covering front-end (React advanced concepts, state management), back-end (Node.js async patterns, API design), database interactions (SQL & NoSQL scenarios), system design principles, and complex algorithms.",
    duration: 180,
    passingScore: 75,
    questions: [
      {
        type: "multiple_choice",
        question: "In React, what is the primary benefit of using `useMemo`?",
        options: [
          "To trigger side effects after render",
          "To memoize callback functions",
          "To memoize expensive calculations based on dependencies",
          "To manage component lifecycle",
        ],
        correctAnswer: 2,
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "multiple_choice",
        question:
          "Which Node.js module is typically used for handling file system operations?",
        options: ["http", "path", "fs", "url"],
        correctAnswer: 2,
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "Explain the concept of 'Event Delegation' in JavaScript and why it is useful.",
        options: ["", "", "", ""],
        correctAnswer:
          "Event delegation involves attaching a single event listener to a parent element to handle events that bubble up from child elements. It's useful for performance (fewer listeners) and handling dynamically added elements.", // Keywords: parent listener, bubble up, performance, dynamic elements
        points: 10,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "Describe the difference between SQL (like PostgreSQL) and NoSQL (like MongoDB) databases in terms of data structure and schema.",
        options: ["", "", "", ""],
        correctAnswer:
          "SQL databases use structured data with predefined schemas (tables, rows, columns) enforcing relationships. NoSQL databases are often schema-less or have dynamic schemas, storing data in formats like documents (JSON-like), key-value pairs, wide-column stores, or graphs.", // Keywords: structured, schema, tables, rows, columns vs schema-less, dynamic, documents, key-value etc.
        points: 15,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "code",
        question:
          "# Problem Title: Implement LRU Cache\n\n## Description\nDesign and implement a Least Recently Used (LRU) cache. It should support the following operations: `get` and `put`.\n\n- `get(key)` - Get the value (will always be positive) of the key if the key exists in the cache, otherwise return -1.\n- `put(key, value)` - Set or insert the value if the key is not already present. When the cache reached its capacity, it should invalidate the least recently used item before inserting a new item.\n\n## Input Format\n- First line: Cache capacity (integer).\n- Subsequent lines: Operations, one per line:\n  - `PUT key value` (key and value are integers)\n  - `GET key` (key is an integer)\n\n## Output Format\nFor each `GET` operation, print the retrieved value or -1 on a new line.\n\n## Constraints\n- `1 <= capacity <= 3000`\n- `0 <= key <= 10000`\n- `1 <= value <= 10^9`\n- At most 2 * 10^5 calls will be made to `get` and `put`.\n\n## Example\n```\nInput:\n2\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4\n\nOutput:\n1\n-1\n-1\n3\n4\n```\n\n## Notes\nEfficiency matters. Consider appropriate data structures (e.g., HashMap + Doubly Linked List).",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 35,
        testCases: [
          {
            input:
              "2\nPUT 1 1\nPUT 2 2\nGET 1\nPUT 3 3\nGET 2\nPUT 4 4\nGET 1\nGET 3\nGET 4",
            expectedOutput: "1\n-1\n-1\n3\n4",
          },
          {
            input:
              "1\nPUT 10 13\nPUT 3 17\nPUT 6 11\nPUT 10 5\nPUT 9 10\nGET 13",
            expectedOutput: "-1",
          },
          {
            input:
              "3\nPUT 1 10\nPUT 2 20\nPUT 3 30\nGET 1\nPUT 4 40\nGET 2\nGET 3\nGET 4",
            expectedOutput: "10\n-1\n30\n40",
          },
        ],
        solutionTemplate:
          "class LRUCache:\n\n    def __init__(self, capacity: int):\n        # Your initialization here\n        pass\n\n    def get(self, key: int) -> int:\n        # Your implementation here\n        pass\n\n    def put(self, key: int, value: int) -> None:\n        # Your implementation here\n        pass\n\n# Example usage (adapt based on language specific input reading):\n# capacity = int(input())\n# cache = LRUCache(capacity)\n# while True: \n#     try: \n#         line = input().split()\n#         op = line[0]\n#         if op == 'PUT':\n#             cache.put(int(line[1]), int(line[2]))\n#         elif op == 'GET':\n#             print(cache.get(int(line[1])))\n#     except EOFError:\n#         break",
      },
      {
        type: "code",
        question:
          "# Problem Title: Validate Binary Search Tree\n\n## Description\nGiven the root of a binary tree, determine if it is a valid binary search tree (BST).\n\nA valid BST is defined as follows:\n- The left subtree of a node contains only nodes with keys less than the node's key.\n- The right subtree of a node contains only nodes with keys greater than the node's key.\n- Both the left and right subtrees must also be binary search trees.\n\n## Input Format\nA representation of the binary tree (e.g., level-order traversal string like \"[5,1,4,null,null,3,6]\" or a pre-defined Node structure if using a specific language environment).\n*Assume for this problem, input is given in a format your chosen language can parse into a tree structure. The test cases below use a simplified string format for illustration.* \n\n## Output Format\nReturn `true` if the tree is a valid BST, otherwise return `false`.\n\n## Constraints\n- The number of nodes in the tree is in the range [1, 10^4].\n- -2^31 <= Node.val <= 2^31 - 1\n\n## Example\n```\nInput (Conceptual):\n    2\n   / \\\n  1   3\nOutput:\ntrue\n```\n```\nInput (Conceptual):\n    5\n   / \\\n  1   4\n     / \\\n    3   6\nOutput:\nfalse \n(Explanation: Node 4's left child 3 is not less than 4, but the main issue is 4 is in the left subtree of 5 but is not less than 5)\n```\n\n## Notes\nConsider using recursion with bounds (min/max allowed values for a subtree). Watch out for integer limits.",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 30,
        testCases: [
          {
            input: "Tree representing [2,1,3]",
            expectedOutput: "true",
          },
          {
            input: "Tree representing [5,1,4,null,null,3,6]",
            expectedOutput: "false",
          },
          {
            input: "Tree representing [1]",
            expectedOutput: "true",
          },
          {
            input: "Tree representing [5,4,6,null,null,3,7]",
            expectedOutput: "false",
          },
        ],
        solutionTemplate:
          "# Definition for a binary tree node.\n# class TreeNode:\n#     def __init__(self, val=0, left=None, right=None):\n#         self.val = val\n#         self.left = left\n#         self.right = right\n\nclass Solution:\n    def isValidBST(self, root) -> bool:\n        # Your implementation here\n        pass\n",
      },
      {
        type: "multiple_choice",
        question: "What is the primary purpose of using Indexes in a database?",
        options: [
          "To enforce data integrity constraints",
          "To speed up data retrieval operations (queries)",
          "To reduce database storage size",
          "To simplify database backup procedures",
        ],
        correctAnswer: 1,
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "Briefly explain the difference between 'Authentication' and 'Authorization' in web security.",
        options: ["", "", "", ""],
        correctAnswer:
          "Authentication verifies who a user is (e.g., login with password). Authorization determines what an authenticated user is allowed to do (e.g., access specific resources or perform actions).", // Keywords: verify identity vs determine permissions
        points: 10,
        testCases: [],
        solutionTemplate: "",
      },
    ],
  },
  {
    id: "2",
    testName: "Data Structures & Algorithms Mastery Test",
    description:
      "A collection of challenging problems focusing on efficient algorithms, complex data structures, and advanced problem-solving techniques.",
    duration: 150,
    passingScore: 80,
    questions: [
      {
        type: "code",
        question:
          '# Problem Title: Word Break\n\n## Description\nGiven a string `s` and a dictionary of strings `wordDict`, return `true` if `s` can be segmented into a space-separated sequence of one or more dictionary words. Note that the same word in the dictionary may be reused multiple times in the segmentation.\n\n## Input Format\n- First line: The input string `s`.\n- Second line: A space-separated list of words in the dictionary `wordDict`.\n\n## Output Format\nReturn `true` or `false`.\n\n## Constraints\n- `1 <= s.length <= 300`\n- `1 <= wordDict.length <= 1000`\n- `1 <= wordDict[i].length <= 20`\n- `s` and `wordDict[i]` consist of lowercase English letters.\n- All the strings of `wordDict` are unique.\n\n## Example\n```\nInput:\nleetcode\nleet code\n\nOutput:\ntrue \n(Explanation: "leetcode" can be segmented as "leet code".)\n```\n```\nInput:\ncatsandog\ncats dog sand and cat\n\nOutput:\nfalse\n```\n\n## Notes\nDynamic programming is a common approach for this problem.',
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 30,
        testCases: [
          {
            input: "leetcode\nleet code",
            expectedOutput: "true",
          },
          {
            input: "applepenapple\napple pen",
            expectedOutput: "true",
          },
          {
            input: "catsandog\ncats dog sand and cat",
            expectedOutput: "false",
          },
          {
            input: "aaaaaaa\naaa aaaa",
            expectedOutput: "true",
          },
          {
            input:
              "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab\na aa aaa aaaa aaaaa aaaaaa aaaaaaa aaaaaaaa aaaaaaaaa aaaaaaaaaa",
            expectedOutput: "false",
          },
        ],
        solutionTemplate:
          "class Solution:\n    def wordBreak(self, s: str, wordDict: list[str]) -> bool:\n        # Your implementation here\n        # Consider DP: dp[i] = True if s[:i] can be segmented\n        pass\n\n# Example Input Reading (Adapt):\n# s = input()\n# wordDict = input().split()\n# sol = Solution()\n# print(sol.wordBreak(s, wordDict))",
      },
      {
        type: "code",
        question:
          "# Problem Title: Course Schedule II\n\n## Description\nThere are a total of `numCourses` courses you have to take, labeled from `0` to `numCourses - 1`. You are given an array `prerequisites` where `prerequisites[i] = [ai, bi]` indicates that you must take course `bi` first if you want to take course `ai`.\n\nReturn the ordering of courses you should take to finish all courses. If there are many valid answers, return any of them. If it is impossible to finish all courses (due to a cycle), return an empty array.\n\n## Input Format\n- First line: The total number of courses `numCourses`.\n- Second line: A list of prerequisites, represented as pairs `[ai, bi]` (e.g., `[[1,0],[2,0],[3,1],[3,2]]`). *Assume input format allows parsing this list.* \n\n## Output Format\nReturn a list representing the topological sort of the courses. Return an empty list if a cycle exists.\n\n## Constraints\n- `1 <= numCourses <= 2000`\n- `0 <= prerequisites.length <= numCourses * (numCourses - 1)`\n- `prerequisites[i].length == 2`\n- `0 <= ai, bi < numCourses`\n- `ai != bi`\n- All the pairs `[ai, bi]` are distinct.\n\n## Example\n```\nInput:\n4\n[[1,0],[2,0],[3,1],[3,2]]\n\nOutput:\n[0, 2, 1, 3] or [0, 1, 2, 3] (Any valid topological sort)\n```\n```\nInput:\n2\n[[1,0],[0,1]]\n\nOutput:\n[] (Cycle detected)\n```\n\n## Notes\nThis is a classic topological sort problem. Consider using Kahn's algorithm (BFS with in-degrees) or DFS.",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 35,
        testCases: [
          {
            input: "4\n[[1,0],[2,0],[3,1],[3,2]]",
            expectedOutput: "[0,1,2,3] or [0,2,1,3]", // Check for valid topo sort
          },
          {
            input: "2\n[[1,0]]",
            expectedOutput: "[0,1]",
          },
          {
            input: "2\n[[1,0],[0,1]]",
            expectedOutput: "[]",
          },
          {
            input: "1\n[]",
            expectedOutput: "[0]",
          },
          {
            input: "3\n[[0,1],[0,2],[1,2]]",
            expectedOutput: "[2,1,0]",
          },
        ],
        solutionTemplate:
          "from collections import defaultdict, deque\n\nclass Solution:\n    def findOrder(self, numCourses: int, prerequisites: list[list[int]]) -> list[int]:\n        # Your implementation here\n        # Suggestion: Use Kahn's algorithm or DFS\n        pass\n",
      },
      {
        type: "code",
        question:
          "# Problem Title: Median of Two Sorted Arrays\n\n## Description\nGiven two sorted arrays `nums1` and `nums2` of size `m` and `n` respectively, return the median of the two sorted arrays. The overall run time complexity should be O(log (m+n)).\n\n## Input Format\n- First line: Space-separated integers for `nums1`.\n- Second line: Space-separated integers for `nums2`.\n*Empty line indicates an empty array.* \n\n## Output Format\nReturn the median as a float.\n\n## Constraints\n- `nums1.length == m`\n- `nums2.length == n`\n- `0 <= m <= 1000`\n- `0 <= n <= 1000`\n- `1 <= m + n <= 2000`\n- `-10^6 <= nums1[i], nums2[i] <= 10^6`\n\n## Example\n```\nInput:\n1 3\n2\n\nOutput:\n2.0\n```\n```\nInput:\n1 2\n3 4\n\nOutput:\n2.5\n```\n\n## Notes\nThis requires an efficient algorithm, likely involving binary search on partitions.",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 35,
        testCases: [
          {
            input: "1 3\n2",
            expectedOutput: "2.0",
          },
          {
            input: "1 2\n3 4",
            expectedOutput: "2.5",
          },
          {
            input: "0 0\n0 0",
            expectedOutput: "0.0",
          },
          {
            input: "\n1",
            expectedOutput: "1.0",
          },
          {
            input: "2\n",
            expectedOutput: "2.0",
          },
        ],
        solutionTemplate:
          "class Solution:\n    def findMedianSortedArrays(self, nums1: list[int], nums2: list[int]) -> float:\n        # Your implementation here\n        # Target complexity: O(log(min(m, n)))\n        pass\n",
      },
    ],
  },
  {
    id: "3",
    testName: "Software Engineer Assessment (General)",
    description:
      "A comprehensive test covering core programming concepts, data structures, algorithms, system design fundamentals, and debugging skills. Suitable for mid-level software engineers. (Generated on: 2025-04-05)",
    duration: 150,
    passingScore: 70,
    questions: [
      {
        type: "multiple_choice",
        question:
          "Which of the following sorting algorithms has the best average-case time complexity?",
        options: [
          "Bubble Sort",
          "Insertion Sort",
          "Merge Sort",
          "Selection Sort",
        ],
        correctAnswer: 2, // Merge Sort (O(n log n))
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "multiple_choice",
        question: "In the context of REST APIs, what does 'stateless' mean?",
        options: [
          "The server cannot store any data.",
          "Each request from a client must contain all information needed by the server to fulfill the request.",
          "The client does not maintain connection state.",
          "The API can only return static, unchanging data.",
        ],
        correctAnswer: 1,
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "multiple_choice",
        question:
          "What is the primary purpose of a `finally` block in a try-catch-finally structure?",
        options: [
          "To catch specific types of errors.",
          "To execute code only if an exception occurs.",
          "To execute cleanup code regardless of whether an exception occurred or not.",
          "To re-throw an exception after logging it.",
        ],
        correctAnswer: 2,
        points: 5,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "Explain the difference between processes and threads in an operating system.",
        options: ["", "", "", ""],
        correctAnswer:
          "A process is an instance of a program with its own memory space. Threads are smaller units within a process that share the process's memory space but have their own execution stack. Creating processes is more resource-intensive than creating threads. Threads within a process can communicate more easily (shared memory), but issues in one thread can affect others.", // Keywords: own memory vs shared memory, resource intensity, communication ease/risk.
        points: 10,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "What is 'dependency injection' and why is it beneficial in software design?",
        options: ["", "", "", ""],
        correctAnswer:
          "Dependency Injection (DI) is a design pattern where an object receives its dependencies (other objects it needs to work with) from an external source rather than creating them itself. Benefits include: Increased modularity, easier testing (can inject mock dependencies), improved code reusability, and reduced coupling between components.", // Keywords: external source, providing dependencies, modularity, testability, reduced coupling.
        points: 15,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "text",
        question:
          "Describe a situation where using a NoSQL database might be preferable to a traditional SQL database.",
        options: ["", "", "", ""],
        correctAnswer:
          "Situations include: Handling large volumes of unstructured or semi-structured data (e.g., user profiles, logs, IoT data), requiring high scalability and availability with flexible schemas, needing rapid development where schema evolves quickly. For example, a social media feed or a product catalog with varying attributes.", // Keywords: Unstructured data, scalability, flexible schema, rapid development, specific examples.
        points: 10,
        testCases: [],
        solutionTemplate: "",
      },
      {
        type: "code",
        question:
          "# Problem Title: Find Missing Number\n\n## Description\nGiven an array `nums` containing `n` distinct numbers in the range `[0, n]`, return the only number in the range that is missing from the array.\n\n## Input Format\nA single line containing space-separated distinct integers.\n\n## Output Format\nA single integer representing the missing number.\n\n## Constraints\n- `n == nums.length`\n- `1 <= n <= 10^4`\n- `0 <= nums[i] <= n`\n- All the numbers of `nums` are unique.\n\n## Example\n```\nInput:\n3 0 1\n\nOutput:\n2\n```\n```\nInput:\n0 1\n\nOutput:\n2\n```\n```\nInput:\n9 6 4 2 3 5 7 0 1\n\nOutput:\n8\n```\n\n## Notes\nConsider solutions with O(n) time complexity and potentially O(1) extra space complexity (e.g., using sum formula or bit manipulation).",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 15,
        testCases: [
          {
            input: "3 0 1",
            expectedOutput: "2",
          },
          {
            input: "0 1",
            expectedOutput: "2",
          },
          {
            input: "9 6 4 2 3 5 7 0 1",
            expectedOutput: "8",
          },
          {
            input: "0",
            expectedOutput: "1",
          },
        ],
        solutionTemplate:
          "def find_missing_number(nums_str: str) -> int:\n    nums = list(map(int, nums_str.split()))\n    n = len(nums)\n    # Your logic here (e.g., expected sum vs actual sum, XOR, etc.)\n    \n    # Placeholder return\n    return -1 \n\n# Example usage:\n# line = input()\n# print(find_missing_number(line))",
      },
      {
        type: "code",
        question:
          "# Problem Title: Basic Parentheses Validation\n\n## Description\nGiven a string `s` containing just the characters '(', ')', '{', '}', '[' and ']', determine if the input string is valid.\nAn input string is valid if:\n1. Open brackets must be closed by the same type of brackets.\n2. Open brackets must be closed in the correct order.\n3. Every close bracket has a corresponding open bracket of the same type.\n\n## Input Format\nA single string `s`.\n\n## Output Format\nReturn `true` if the string is valid, `false` otherwise.\n\n## Constraints\n- `1 <= s.length <= 10^4`\n- `s` consists of parentheses only '()[]{}'.\n\n## Example\n```\nInput:\n()[]{}\n\nOutput:\ntrue\n```\n```\nInput:\n(]\n\nOutput:\nfalse\n```\n```\nInput:\n{[]}\n\nOutput:\ntrue\n```\n\n## Notes\nA stack data structure is commonly used to solve this problem.",
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 20,
        testCases: [
          {
            input: "()",
            expectedOutput: "true",
          },
          {
            input: "()[]{}",
            expectedOutput: "true",
          },
          {
            input: "(]",
            expectedOutput: "false",
          },
          {
            input: "([)]",
            expectedOutput: "false",
          },
          {
            input: "{[]}",
            expectedOutput: "true",
          },
          {
            input: "]",
            expectedOutput: "false",
          },
          {
            input: "((",
            expectedOutput: "false",
          },
        ],
        solutionTemplate:
          "def is_valid_parentheses(s: str) -> bool:\n    stack = []\n    mapping = {')': '(', '}': '{', ']': '['}\n    \n    # Your stack-based validation logic here\n    \n    # Placeholder return\n    return False\n\n# Example usage:\n# line = input()\n# print(is_valid_parentheses(line))",
      },
      {
        type: "code",
        question:
          '# Problem Title: FizzBuzz\n\n## Description\nGiven an integer `n`, return a list of strings where:\n- `answer[i] == "FizzBuzz"` if `i` is divisible by 3 and 5.\n- `answer[i] == "Fizz"` if `i` is divisible by 3.\n- `answer[i] == "Buzz"` if `i` is divisible by 5.\n- `answer[i] == i` (as a string) if none of the above conditions are true.\n\nThe list should be 1-indexed up to `n`.\n\n## Input Format\nA single integer `n`.\n\n## Output Format\nA single line containing the space-separated string representation of the resulting list.\n\n## Constraints\n- `1 <= n <= 10^4`\n\n## Example\n```\nInput:\n15\n\nOutput:\n1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz\n```\n\n## Notes\nThis is a classic introductory programming problem. Pay attention to the order of checks (FizzBuzz before Fizz or Buzz).',
        options: ["", "", "", ""],
        correctAnswer: 0,
        points: 10,
        testCases: [
          {
            input: "3",
            expectedOutput: "1 2 Fizz",
          },
          {
            input: "5",
            expectedOutput: "1 2 Fizz 4 Buzz",
          },
          {
            input: "15",
            expectedOutput:
              "1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz",
          },
          {
            input: "1",
            expectedOutput: "1",
          },
        ],
        solutionTemplate:
          "def fizz_buzz(n: int) -> str:\n    result = []\n    for i in range(1, n + 1):\n        # Your FizzBuzz logic here\n        pass # Replace with append logic\n        \n    return ' '.join(result)\n\n# Example usage:\n# n_val = int(input())\n# print(fizz_buzz(n_val))",
      },
    ],
  },
];

module.exports = HIRING_TESTS;
